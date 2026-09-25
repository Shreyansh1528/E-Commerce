/**
 * Scheduled Batch Purge Engine & Jurisdiction Rule Manager
 * Hotels Register Compliance Module (GDPR Article 5(1)(e))
 */

(function(exports) {
  'use strict';

  const DEFAULT_JURISDICTIONS = {
    GERMANY: {
      id: 'GERMANY',
      name: 'Germany (§30 BMG)',
      retentionDays: 365, // 1 year
      softDeleteGraceDays: 30,
      lawReference: 'Germany Bundesmeldegesetz §30 BMG',
      description: 'Statutory guest registration retention limit of 1 year following check-out.'
    },
    SPAIN: {
      id: 'SPAIN',
      name: 'Spain (RD 933/2021)',
      retentionDays: 1095, // 3 years
      softDeleteGraceDays: 30,
      lawReference: 'Spain Real Decreto 933/2021',
      description: 'Obligatory traveller registry preservation limit of 3 years following check-out.'
    },
    ITALY: {
      id: 'ITALY',
      name: 'Italy (TULPS Art. 109)',
      retentionDays: 1825, // 5 years
      softDeleteGraceDays: 30,
      lawReference: 'Italy Testo Unico delle Leggi di Pubblica Sicurezza Art. 109',
      description: 'Police registration data retention limit of 5 years following check-out.'
    }
  };

  class JurisdictionRuleManager {
    constructor(initialRules) {
      this.rules = JSON.parse(JSON.stringify(initialRules || DEFAULT_JURISDICTIONS));
      this.propertyJurisdiction = 'GERMANY'; // Default
    }

    getJurisdiction(id) {
      return this.rules[id] || null;
    }

    getAllJurisdictions() {
      return Object.values(this.rules);
    }

    setPropertyJurisdiction(jurisdictionId) {
      if (!this.rules[jurisdictionId]) {
        throw new Error(`Unknown jurisdiction rule: ${jurisdictionId}`);
      }
      this.propertyJurisdiction = jurisdictionId;
      return this.rules[jurisdictionId];
    }

    getPropertyJurisdictionRule() {
      return this.rules[this.propertyJurisdiction] || DEFAULT_JURISDICTIONS.GERMANY;
    }

    updateJurisdictionRule(id, updates) {
      if (!this.rules[id]) {
        this.rules[id] = { id, name: id, retentionDays: 365, softDeleteGraceDays: 30, lawReference: 'Custom', description: '' };
      }
      Object.assign(this.rules[id], updates);
      return this.rules[id];
    }
  }

  class ComplianceAuditLogger {
    constructor() {
      this.logs = [];
    }

    logEvent({ eventType, actor, targetRecordId, jurisdiction, details }) {
      const entry = {
        id: 'LOG-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        timestamp: new Date().toISOString(),
        eventType, // AUTOMATED_SOFT_DELETE, AUTOMATED_HARD_PURGE, LEGAL_HOLD_APPLIED, LEGAL_HOLD_RELEASED, RULE_UPDATED
        actor: actor || 'System Worker',
        targetRecordId: targetRecordId || 'N/A',
        jurisdiction: jurisdiction || 'N/A',
        details: details || ''
      };
      this.logs.unshift(entry);
      return entry;
    }

    getLogs(filters = {}) {
      return this.logs.filter(log => {
        if (filters.eventType && log.eventType !== filters.eventType) return false;
        if (filters.targetRecordId && !log.targetRecordId.toLowerCase().includes(filters.targetRecordId.toLowerCase())) return false;
        if (filters.search && !JSON.stringify(log).toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      });
    }

    clearLogs() {
      this.logs = [];
    }
  }

  class GuestRegisterEngine {
    constructor(ruleManager, auditLogger, initialRecords) {
      this.ruleManager = ruleManager || new JurisdictionRuleManager();
      this.auditLogger = auditLogger || new ComplianceAuditLogger();
      this.records = initialRecords || [];
    }

    addRecord(record) {
      const jurisdiction = record.propertyJurisdiction || this.ruleManager.propertyJurisdiction;
      const rule = this.ruleManager.getJurisdiction(jurisdiction) || this.ruleManager.getPropertyJurisdictionRule();

      const newRecord = {
        id: record.id || 'GST-' + Math.floor(10000 + Math.random() * 90000),
        guestName: record.guestName,
        documentId: record.documentId,
        roomNumber: record.roomNumber,
        checkInDate: record.checkInDate,
        checkOutDate: record.checkOutDate,
        propertyJurisdiction: jurisdiction,
        status: record.status || 'ACTIVE', // ACTIVE, SOFT_DELETED, HARD_PURGED
        legalHold: Boolean(record.legalHold),
        legalHoldReason: record.legalHoldReason || null,
        legalHoldSetBy: record.legalHoldSetBy || null,
        legalHoldSetAt: record.legalHoldSetAt || null,
        softDeletedAt: record.softDeletedAt || null,
        hardPurgedAt: record.hardPurgedAt || null
      };

      this.records.push(newRecord);
      return newRecord;
    }

    getRecord(id) {
      return this.records.find(r => r.id === id) || null;
    }

    getExpirationDate(record) {
      const rule = this.ruleManager.getJurisdiction(record.propertyJurisdiction) || this.ruleManager.getPropertyJurisdictionRule();
      const checkOutMs = new Date(record.checkOutDate).getTime();
      const retentionMs = rule.retentionDays * 24 * 60 * 60 * 1000;
      return new Date(checkOutMs + retentionMs);
    }

    getHardPurgeDate(record) {
      if (!record.softDeletedAt) return null;
      const rule = this.ruleManager.getJurisdiction(record.propertyJurisdiction) || this.ruleManager.getPropertyJurisdictionRule();
      const softDeletedMs = new Date(record.softDeletedAt).getTime();
      const graceMs = rule.softDeleteGraceDays * 24 * 60 * 60 * 1000;
      return new Date(softDeletedMs + graceMs);
    }

    isExpired(record, now = new Date()) {
      const expirationDate = this.getExpirationDate(record);
      return new Date(now).getTime() >= expirationDate.getTime();
    }

    isGracePeriodExpired(record, now = new Date()) {
      if (!record.softDeletedAt) return false;
      const hardPurgeDate = this.getHardPurgeDate(record);
      return new Date(now).getTime() >= hardPurgeDate.getTime();
    }

    setLegalHold(recordId, holdState, reason, actor = 'Compliance Officer') {
      const record = this.getRecord(recordId);
      if (!record) throw new Error(`Record not found: ${recordId}`);
      if (record.status === 'HARD_PURGED') {
        throw new Error(`Cannot modify legal hold on hard purged record: ${recordId}`);
      }

      record.legalHold = Boolean(holdState);
      if (holdState) {
        record.legalHoldReason = reason || 'Under legal investigation hold';
        record.legalHoldSetBy = actor;
        record.legalHoldSetAt = new Date().toISOString();

        this.auditLogger.logEvent({
          eventType: 'LEGAL_HOLD_APPLIED',
          actor,
          targetRecordId: record.id,
          jurisdiction: record.propertyJurisdiction,
          details: `Applied Legal Hold to record ${record.id} (${record.guestName}). Reason: ${record.legalHoldReason}`
        });
      } else {
        const previousReason = record.legalHoldReason;
        record.legalHoldReason = null;
        record.legalHoldSetBy = null;
        record.legalHoldSetAt = null;

        this.auditLogger.logEvent({
          eventType: 'LEGAL_HOLD_RELEASED',
          actor,
          targetRecordId: record.id,
          jurisdiction: record.propertyJurisdiction,
          details: `Released Legal Hold from record ${record.id} (${record.guestName}). Previous hold reason: ${previousReason || 'N/A'}`
        });
      }
      return record;
    }

    /**
     * Scheduled Batch Purge Engine Worker Execution
     * Sweeps records in indexed batches to eliminate database lock contention
     */
    runBatchPurgeJob(options = {}) {
      const now = options.now ? new Date(options.now) : new Date();
      const batchSize = options.batchSize || 50;
      const actor = options.actor || 'Scheduled Off-Peak Purge Worker (Cron)';

      const eligibleRecords = this.records.filter(r => r.status !== 'HARD_PURGED');
      const totalEligible = eligibleRecords.length;

      let softDeletedCount = 0;
      let hardPurgedCount = 0;
      let bypassedLegalHoldCount = 0;
      let batchCount = 0;

      // Process in indexed batches
      for (let i = 0; i < totalEligible; i += batchSize) {
        batchCount++;
        const batchChunk = eligibleRecords.slice(i, i + batchSize);

        for (const record of batchChunk) {
          // Check Legal Hold Guardrail First
          if (record.legalHold) {
            if (this.isExpired(record, now) || (record.status === 'SOFT_DELETED' && this.isGracePeriodExpired(record, now))) {
              bypassedLegalHoldCount++;
            }
            continue; // BYPASS record from purging
          }

          // Stage 2 check: Soft-Deleted records exceeding grace period -> HARD PURGE
          if (record.status === 'SOFT_DELETED') {
            if (this.isGracePeriodExpired(record, now)) {
              record.status = 'HARD_PURGED';
              record.hardPurgedAt = now.toISOString();
              // GDPR unrecoverable sanitization
              record.guestName = '[HARD_PURGED]';
              record.documentId = '[PURGED]';
              record.roomNumber = '[PURGED]';
              hardPurgedCount++;

              this.auditLogger.logEvent({
                eventType: 'AUTOMATED_HARD_PURGE',
                actor,
                targetRecordId: record.id,
                jurisdiction: record.propertyJurisdiction,
                details: `Permanently hard-purged expired soft-deleted record ${record.id} after grace period completion.`
              });
            }
          }
          // Stage 1 check: Active records exceeding retention period -> SOFT DELETE
          else if (record.status === 'ACTIVE') {
            if (this.isExpired(record, now)) {
              record.status = 'SOFT_DELETED';
              record.softDeletedAt = now.toISOString();
              softDeletedCount++;

              this.auditLogger.logEvent({
                eventType: 'AUTOMATED_SOFT_DELETE',
                actor,
                targetRecordId: record.id,
                jurisdiction: record.propertyJurisdiction,
                details: `Soft-deleted expired record ${record.id} (${record.guestName}) based on check-out date (${record.checkOutDate}) and ${record.propertyJurisdiction} retention rule.`
              });
            }
          }
        }
      }

      return {
        timestamp: now.toISOString(),
        totalEvaluated: totalEligible,
        batchSize,
        batchCount,
        softDeletedCount,
        hardPurgedCount,
        bypassedLegalHoldCount
      };
    }
  }

  // Export for Node.js / Jest or Browser Global
  exports.DEFAULT_JURISDICTIONS = DEFAULT_JURISDICTIONS;
  exports.JurisdictionRuleManager = JurisdictionRuleManager;
  exports.ComplianceAuditLogger = ComplianceAuditLogger;
  exports.GuestRegisterEngine = GuestRegisterEngine;

})(typeof exports !== 'undefined' ? exports : (window.ComplianceEngine = {}));
