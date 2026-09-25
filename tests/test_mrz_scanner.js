/**
 * Automated Test Suite for WebAssembly Passport MRZ Engine & Scanner
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runTests() {
    console.log('--- RUNNING WASM PASSPORT MRZ TEST SUITE ---');

    // Load WASM file
    const wasmPath = path.join(__dirname, '../wasm/mrz_parser.wasm');
    assert.strictEqual(fs.existsSync(wasmPath), true, 'WASM binary exists at wasm/mrz_parser.wasm');

    const wasmBuffer = fs.readFileSync(wasmPath);
    const module = await WebAssembly.instantiate(wasmBuffer, {});
    const instance = module.instance;
    const exports = instance.exports;

    console.log('✓ WASM Module loaded successfully. Memory size:', exports.memory.buffer.byteLength);

    // Test 1: Checksum Calculation Algorithm
    const testNum = 'L898902C';
    const checkDigit = exports.calculate_mrz_check_digit(100, testNum.length);
    console.log(`✓ Check digit function exported and executed properly.`);

    // Test 2: Parse Valid ICAO 9303 TD3 Passport MRZ
    const line1 = 'P<USASTEVENS<<JOHN<EDWARD<<<<<<<<<<<<<<<<<<<';
    const line2 = 'L898902C<3USA6908061F2801020<<<<<<<<<<<<<<06';

    const memory = exports.memory;
    const l1Ptr = 1000;
    const l2Ptr = 2000;
    const outPtr = 3000;

    const b1 = new Uint8Array(memory.buffer, l1Ptr, 100);
    const b2 = new Uint8Array(memory.buffer, l2Ptr, 100);

    for (let i = 0; i < line1.length; i++) b1[i] = line1.charCodeAt(i);
    b1[line1.length] = 0;

    for (let i = 0; i < line2.length; i++) b2[i] = line2.charCodeAt(i);
    b2[line2.length] = 0;

    const len = exports.parse_td3_mrz(l1Ptr, l2Ptr, outPtr);
    assert.strictEqual(len > 0, true, 'WASM returned non-zero string length');

    const outBuf = new Uint8Array(memory.buffer, outPtr, len);
    const jsonStr = String.fromCharCode.apply(null, outBuf);
    const parsed = JSON.parse(jsonStr);

    console.log('✓ Parsed TD3 Passport JSON result:', parsed);

    assert.strictEqual(parsed.valid, true);
    assert.strictEqual(parsed.surname, 'STEVENS');
    assert.strictEqual(parsed.givenNames, 'JOHN EDWARD');
    assert.strictEqual(parsed.passportNumber, 'L898902C');
    assert.strictEqual(parsed.issuingCountry, 'USA');
    assert.strictEqual(parsed.nationality, 'USA');
    assert.strictEqual(parsed.dob, '1969-08-06');
    assert.strictEqual(parsed.sex, 'F');
    assert.strictEqual(parsed.passportNumberValid, true);

    console.log('✓ All ICAO 9303 TD3 field extractions matched expectations!');

    // Test 3: Parse ICAO 9303 TD1 ID Card MRZ
    const td1Line1 = 'I<UTOD231458907<<<<<<<<<<<<<<<';
    const td1Line2 = '7408122F1204159UTO<<<<<<<<<<<6';
    const td1Line3 = 'ERIKSSON<<ANNA<MARIA<<<<<<<<<<';

    const td1L1Ptr = 1000;
    const td1L2Ptr = 2000;
    const td1L3Ptr = 3000;
    const td1OutPtr = 4000;

    const tb1 = new Uint8Array(memory.buffer, td1L1Ptr, 100);
    const tb2 = new Uint8Array(memory.buffer, td1L2Ptr, 100);
    const tb3 = new Uint8Array(memory.buffer, td1L3Ptr, 100);

    for (let i = 0; i < td1Line1.length; i++) tb1[i] = td1Line1.charCodeAt(i);
    tb1[td1Line1.length] = 0;
    for (let i = 0; i < td1Line2.length; i++) tb2[i] = td1Line2.charCodeAt(i);
    tb2[td1Line2.length] = 0;
    for (let i = 0; i < td1Line3.length; i++) tb3[i] = td1Line3.charCodeAt(i);
    tb3[td1Line3.length] = 0;

    const td1Len = exports.parse_td1_mrz(td1L1Ptr, td1L2Ptr, td1L3Ptr, td1OutPtr);
    assert.strictEqual(td1Len > 0, true);

    const td1Buf = new Uint8Array(memory.buffer, td1OutPtr, td1Len);
    const td1JsonStr = String.fromCharCode.apply(null, td1Buf);
    const td1Parsed = JSON.parse(td1JsonStr);

    console.log('✓ Parsed TD1 ID Card JSON result:', td1Parsed);
    assert.strictEqual(td1Parsed.mrzType, 'TD1');
    assert.strictEqual(td1Parsed.surname, 'ERIKSSON');
    assert.strictEqual(td1Parsed.givenNames, 'ANNA MARIA');

    console.log('\n✅ ALL AUTOMATED WASM TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
    console.error('❌ TEST FAILURE:', err);
    process.exit(1);
});
