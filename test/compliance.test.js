const assert = require('assert');
const {
  DEFAULT_JURISDICTIONS,
  JurisdictionRuleManager,
  ComplianceAuditLogger,
  GuestRegisterEngine
} = require('../js/compliance.js');

console.log('=== RUNNING COMPLIANCE ENGINE TESTS ===\n');

let passedTests = 0;
function test(description, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${description}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Jurisdiction Rule Manager Tests
test('Jurisdiction rules for Germany, Spain, and Italy are properly configured', () => {
  const manager = new JurisdictionRuleManager();
  
  const de = manager.getJurisdiction('GERMANY');
  assert.strictEqual(de.retentionDays, 365, 'Germany should have 365 days retention');
  assert.ok(de.lawReference.includes('BMG'), 'Germany law reference should include BMG');

  const es = manager.getJurisdiction('SPAIN');
  assert.strictEqual(es.retentionDays, 1095, 'Spain should have 1095 days (3 yrs) retention');
  assert.ok(es.lawReference.includes('933/2021'), 'Spain law reference check');

  const it = manager.getJurisdiction('ITALY');
  assert.strictEqual(it.retentionDays, 1825, 'Italy should have 1825 days (5 yrs) retention');
  assert.ok(it.lawReference.includes('109'), 'Italy law reference check');
});

test('Property jurisdiction selection and rule updates', () => {
  const manager = new JurisdictionRuleManager();
  manager.setPropertyJurisdiction('SPAIN');
  assert.strictEqual(manager.propertyJurisdiction, 'SPAIN');
  assert.strictEqual(manager.getPropertyJurisdictionRule().retentionDays, 1095);

  manager.updateJurisdictionRule('SPAIN', { retentionDays: 1000 });
  assert.strictEqual(manager.getJurisdiction('SPAIN').retentionDays, 1000);
});

// 2. Expiration Date Calculation Tests
test('Guest record expiration date calculation based on checkout timestamp', () => {
  const manager = new JurisdictionRuleManager();
  const logger = new ComplianceAuditLogger();
  const engine = new GuestRegisterEngine(manager, logger);

  const checkOutDate = '2025-01-01T10:00:00Z';
  const recordDE = engine.addRecord({
    guestName: 'Klaus Mueller',
    checkOutDate,
    propertyJurisdiction: 'GERMANY'
  });

  const expDE = engine.getExpirationDate(recordDE);
  const expectedDE = new Date(new Date(checkOutDate).getTime() + 365 * 24 * 60 * 60 * 1000);
  assert.strictEqual(expDE.toISOString(), expectedDE.toISOString());

  // Test before expiration
  const beforeExp = new Date('2025-06-01T10:00:00Z');
  assert.strictEqual(engine.isExpired(recordDE, beforeExp), false);

  // Test after expiration (1 year + 1 day later)
  const afterExp = new Date('2026-01-03T10:00:00Z');
  assert.strictEqual(engine.isExpired(recordDE, afterExp), true);
});

// 3. Automated Batch Purge Engine - Stage 1 Soft Delete
test('Batch purge job soft-deletes expired records in indexed batches', () => {
  const manager = new JurisdictionRuleManager();
  const logger = new ComplianceAuditLogger();
  const engine = new GuestRegisterEngine(manager, logger);

  // Add 10 records: 5 expired, 5 active
  for (let i = 1; i <= 5; i++) {
    engine.addRecord({
      id: `EXPIRED-${i}`,
      guestName: `Expired Guest ${i}`,
      checkOutDate: '2023-01-01T10:00:00Z', // Old date
      propertyJurisdiction: 'GERMANY'
    });
  }
  for (let i = 1; i <= 5; i++) {
    engine.addRecord({
      id: `ACTIVE-${i}`,
      guestName: `Active Guest ${i}`,
      checkOutDate: '2026-08-01T10:00:00Z', // Recent date
      propertyJurisdiction: 'GERMANY'
    });
  }

  const now = new Date('2026-09-25T12:00:00Z');
  const result = engine.runBatchPurgeJob({ batchSize: 3, now });

  assert.strictEqual(result.softDeletedCount, 5, 'Should soft delete 5 expired records');
  assert.strictEqual(result.hardPurgedCount, 0, 'No hard purges yet');
  assert.strictEqual(result.bypassedLegalHoldCount, 0, 'No legal holds yet');
  assert.strictEqual(result.batchCount, 4, '10 records processed in batches of 3 = 4 batches');

  // Verify status of records
  assert.strictEqual(engine.getRecord('EXPIRED-1').status, 'SOFT_DELETED');
  assert.strictEqual(engine.getRecord('ACTIVE-1').status, 'ACTIVE');

  // Verify audit logs generated
  const logs = logger.getLogs({ eventType: 'AUTOMATED_SOFT_DELETE' });
  assert.strictEqual(logs.length, 5, 'Audit logs should contain 5 soft delete entries');
});

// 4. Legal Hold Bypass Guardrail
test('Legal hold flags pause purging and bypass batch purge routines', () => {
  const manager = new JurisdictionRuleManager();
  const logger = new ComplianceAuditLogger();
  const engine = new GuestRegisterEngine(manager, logger);

  const heldRecord = engine.addRecord({
    id: 'HELD-101',
    guestName: 'Investigated Guest',
    checkOutDate: '2023-01-01T10:00:00Z',
    propertyJurisdiction: 'GERMANY'
  });

  // Apply legal hold
  engine.setLegalHold('HELD-101', true, 'Police Investigation #88291', 'Officer Schmidt');
  assert.strictEqual(heldRecord.legalHold, true);
  assert.strictEqual(heldRecord.legalHoldReason, 'Police Investigation #88291');

  // Verify audit log for legal hold application
  const holdLogs = logger.getLogs({ eventType: 'LEGAL_HOLD_APPLIED' });
  assert.strictEqual(holdLogs.length, 1);
  assert.ok(holdLogs[0].details.includes('Police Investigation #88291'));

  // Run batch purge job
  const now = new Date('2026-09-25T12:00:00Z');
  const result = engine.runBatchPurgeJob({ batchSize: 10, now });

  assert.strictEqual(result.softDeletedCount, 0, 'Held record must not be soft deleted');
  assert.strictEqual(result.bypassedLegalHoldCount, 1, 'Held record must be recorded as bypassed');
  assert.strictEqual(heldRecord.status, 'ACTIVE', 'Held record remains ACTIVE');

  // Release legal hold and run job again
  engine.setLegalHold('HELD-101', false, null, 'Officer Schmidt');
  assert.strictEqual(heldRecord.legalHold, false);

  const releaseLogs = logger.getLogs({ eventType: 'LEGAL_HOLD_RELEASED' });
  assert.strictEqual(releaseLogs.length, 1);

  const result2 = engine.runBatchPurgeJob({ batchSize: 10, now });
  assert.strictEqual(result2.softDeletedCount, 1, 'Once hold is released, record is soft deleted');
  assert.strictEqual(heldRecord.status, 'SOFT_DELETED');
});

// 5. Stage 2 Hard Purge after Grace Period Completion
test('Soft-deleted records permanently hard-purge after grace period expiration', () => {
  const manager = new JurisdictionRuleManager();
  const logger = new ComplianceAuditLogger();
  const engine = new GuestRegisterEngine(manager, logger);

  const record = engine.addRecord({
    id: 'PURGE-ME',
    guestName: 'Jane Doe',
    documentId: 'PASSPORT-12345',
    checkOutDate: '2023-01-01T10:00:00Z',
    propertyJurisdiction: 'GERMANY'
  });

  // Step 1: Run soft delete pass at t1
  const t1 = new Date('2026-01-01T10:00:00Z');
  engine.runBatchPurgeJob({ batchSize: 10, now: t1 });
  assert.strictEqual(record.status, 'SOFT_DELETED');
  assert.ok(record.softDeletedAt);

  // Step 2: Run batch job during grace period (15 days later) -> should stay SOFT_DELETED
  const t2 = new Date('2026-01-16T10:00:00Z');
  const res2 = engine.runBatchPurgeJob({ batchSize: 10, now: t2 });
  assert.strictEqual(res2.hardPurgedCount, 0);
  assert.strictEqual(record.status, 'SOFT_DELETED');

  // Step 3: Run batch job after grace period (35 days later) -> should HARD_PURGE
  const t3 = new Date('2026-02-06T10:00:00Z');
  const res3 = engine.runBatchPurgeJob({ batchSize: 10, now: t3 });
  assert.strictEqual(res3.hardPurgedCount, 1);
  assert.strictEqual(record.status, 'HARD_PURGED');
  assert.strictEqual(record.guestName, '[HARD_PURGED]', 'Personal name must be sanitized/unrecoverable');
  assert.strictEqual(record.documentId, '[PURGED]', 'Document ID must be sanitized');

  // Check audit log for hard purge
  const hardLogs = logger.getLogs({ eventType: 'AUTOMATED_HARD_PURGE' });
  assert.strictEqual(hardLogs.length, 1);
  assert.ok(hardLogs[0].details.includes('Permanently hard-purged'));
});

console.log(`\n🎉 ALL ${passedTests} TESTS PASSED SUCCESSFULLY!`);
