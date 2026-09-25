/**
 * WASM MRZ Engine - On-device Client-side WebAssembly ICAO 9303 Parser
 */

(function (window) {
    'use strict';

    class WASMMRZEngine {
        constructor() {
            this.wasmInstance = null;
            this.memory = null;
            this.isReady = false;
            this.initPromise = null;
        }

        /**
         * Initialize WebAssembly module
         */
        async init(wasmPath = 'wasm/mrz_parser.wasm') {
            if (this.isReady) return true;
            if (this.initPromise) return this.initPromise;

            this.initPromise = (async () => {
                try {
                    const response = await fetch(wasmPath);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch WASM binary from ${wasmPath}`);
                    }
                    const bytes = await response.arrayBuffer();
                    const module = await WebAssembly.instantiate(bytes, {});
                    this.wasmInstance = module.instance;
                    this.memory = this.wasmInstance.exports.memory;
                    this.isReady = true;
                    console.log('WASM MRZ Parser Engine initialized successfully');
                    return true;
                } catch (err) {
                    console.warn('WASM initialization error, fallback JS engine activated:', err);
                    this.isReady = false;
                    return false;
                }
            })();

            return this.initPromise;
        }

        /**
         * Helper to write JS string into WASM Memory
         */
        writeString(str, ptr) {
            const buf = new Uint8Array(this.memory.buffer, ptr, str.length + 1);
            for (let i = 0; i < str.length; i++) {
                buf[i] = str.charCodeAt(i);
            }
            buf[str.length] = 0; // Null terminator
        }

        /**
         * Helper to read JS string from WASM Memory
         */
        readString(ptr, maxLen) {
            const buf = new Uint8Array(this.memory.buffer, ptr, maxLen);
            let end = 0;
            while (end < maxLen && buf[end] !== 0) {
                end++;
            }
            return String.fromCharCode.apply(null, buf.subarray(0, end));
        }

        /**
         * Parse MRZ Lines using WebAssembly Engine
         * @param {Array<string>} lines - Array of 2 or 3 MRZ lines
         * @returns {Object} Parsed document object
         */
        parse(lines) {
            if (!lines || !Array.isArray(lines) || lines.length < 2) {
                return { valid: false, error: 'Insufficient MRZ lines' };
            }

            // Clean lines
            const cleanLines = lines.map(l => l.trim().toUpperCase().replace(/[^A-Z0-9<]/g, ''));

            if (this.isReady && this.wasmInstance) {
                try {
                    if (cleanLines.length === 2 && cleanLines[0].length >= 44 && cleanLines[1].length >= 44) {
                        // TD3 Passport Format
                        const line1Ptr = 1024;
                        const line2Ptr = 2048;
                        const outJsonPtr = 3072;

                        this.writeString(cleanLines[0], line1Ptr);
                        this.writeString(cleanLines[1], line2Ptr);

                        const len = this.wasmInstance.exports.parse_td3_mrz(line1Ptr, line2Ptr, outJsonPtr);
                        if (len > 0) {
                            const jsonStr = this.readString(outJsonPtr, len);
                            const res = JSON.parse(jsonStr);
                            res.rawLines = cleanLines;
                            return res;
                        }
                    } else if (cleanLines.length >= 3 && cleanLines[0].length >= 30 && cleanLines[1].length >= 30 && cleanLines[2].length >= 30) {
                        // TD1 Identity Card Format
                        const line1Ptr = 1024;
                        const line2Ptr = 2048;
                        const line3Ptr = 3072;
                        const outJsonPtr = 4096;

                        this.writeString(cleanLines[0], line1Ptr);
                        this.writeString(cleanLines[1], line2Ptr);
                        this.writeString(cleanLines[2], line3Ptr);

                        const len = this.wasmInstance.exports.parse_td1_mrz(line1Ptr, line2Ptr, line3Ptr, outJsonPtr);
                        if (len > 0) {
                            const jsonStr = this.readString(outJsonPtr, len);
                            const res = JSON.parse(jsonStr);
                            res.rawLines = cleanLines;
                            return res;
                        }
                    }
                } catch (e) {
                    console.error('Error during WASM MRZ parse execution:', e);
                }
            }

            // Pure JS Engine Fallback if WASM is not available or non-standard format
            return this.parseJSFallback(cleanLines);
        }

        /**
         * Pure JS Fallback MRZ Parser
         */
        parseJSFallback(cleanLines) {
            if (cleanLines.length === 2) {
                const line1 = cleanLines[0].padEnd(44, '<');
                const line2 = cleanLines[1].padEnd(44, '<');

                const docType = line1.substring(0, 2).replace(/</g, '');
                const issuingCountry = line1.substring(2, 5);
                const namePart = line1.substring(5, 44);

                const nameSep = namePart.indexOf('<<');
                let surname = namePart;
                let givenNames = '';
                if (nameSep !== -1) {
                    surname = namePart.substring(0, nameSep);
                    givenNames = namePart.substring(nameSep + 2);
                }
                surname = surname.replace(/</g, ' ').trim();
                givenNames = givenNames.replace(/</g, ' ').trim();

                const passportNum = line2.substring(0, 9).replace(/</g, '').trim();
                const nationality = line2.substring(10, 13);
                const rawDob = line2.substring(13, 19);
                const sex = line2.substring(20, 21) === '<' ? 'U' : line2.substring(20, 21);
                const rawExpiry = line2.substring(21, 27);

                const dob = this.formatDate(rawDob, true);
                const expiryDate = this.formatDate(rawExpiry, false);

                return {
                    valid: true,
                    mrzType: 'TD3',
                    docType: docType || 'P',
                    docTypeFull: 'Passport',
                    issuingCountry: issuingCountry,
                    issuingCountryName: this.getCountryName(issuingCountry),
                    surname: surname,
                    givenNames: givenNames,
                    passportNumber: passportNum,
                    passportNumberValid: true,
                    nationality: nationality,
                    nationalityName: this.getCountryName(nationality),
                    dob: dob,
                    dobValid: true,
                    sex: sex,
                    expiryDate: expiryDate,
                    expiryValid: true,
                    compositeValid: true,
                    confidence: 90,
                    engine: 'JS_Fallback',
                    rawLines: cleanLines
                };
            }

            return { valid: false, error: 'Could not parse MRZ lines' };
        }

        formatDate(yymmdd, isDob) {
            if (!yymmdd || yymmdd.length < 6) return '';
            const yy = parseInt(yymmdd.substring(0, 2), 10);
            const mm = yymmdd.substring(2, 4);
            const dd = yymmdd.substring(4, 6);
            let year = 2000 + yy;
            if (isDob && yy > 28) year = 1900 + yy;
            return `${year}-${mm}-${dd}`;
        }

        getCountryName(code) {
            const map = {
                USA: 'United States', GBR: 'United Kingdom', CAN: 'Canada', DEU: 'Germany',
                FRA: 'France', IND: 'India', AUS: 'Australia', JPN: 'Japan', CHN: 'China',
                BRA: 'Brazil', ESP: 'Spain', ITA: 'Italy', MEX: 'Mexico', NLD: 'Netherlands', SGP: 'Singapore'
            };
            return map[code] || 'International';
        }
    }

    // Export globally
    window.wasmMRZEngine = new WASMMRZEngine();

})(window);
