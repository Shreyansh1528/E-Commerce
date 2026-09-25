#define WASM_EXPORT __attribute__((visibility("default")))

WASM_EXPORT
void* memcpy(void* dest, const void* src, unsigned long n) {
    char* d = (char*)dest;
    const char* s = (const char*)src;
    for (unsigned long i = 0; i < n; i++) {
        d[i] = s[i];
    }
    return dest;
}

WASM_EXPORT
void* memset(void* s, int c, unsigned long n) {
    char* p = (char*)s;
    for (unsigned long i = 0; i < n; i++) {
        p[i] = (char)c;
    }
    return s;
}

// Helper functions for string memory
static int str_len(const char* s) {
    int l = 0;
    while (s[l]) l++;
    return l;
}

static void str_copy(char* dest, const char* src, int max_len) {
    int i = 0;
    while (src[i] && i < max_len - 1) {
        dest[i] = src[i];
        i++;
    }
    dest[i] = '\0';
}

static void trim_trailing_fillers(char* str) {
    int len = str_len(str);
    while (len > 0 && (str[len - 1] == '<' || str[len - 1] == ' ')) {
        str[len - 1] = '\0';
        len--;
    }
}

static void replace_fillers_with_spaces(char* str) {
    for (int i = 0; str[i] != '\0'; i++) {
        if (str[i] == '<') {
            str[i] = ' ';
        }
    }
}

// ICAO 9303 Weighting Algorithm: Weights are 7, 3, 1
WASM_EXPORT
int calculate_mrz_check_digit(const char* str, int len) {
    static const int weights[3] = {7, 3, 1};
    int sum = 0;
    for (int i = 0; i < len; i++) {
        char c = str[i];
        int val = 0;
        if (c >= '0' && c <= '9') {
            val = c - '0';
        } else if (c >= 'A' && c <= 'Z') {
            val = c - 'A' + 10;
        } else if (c >= 'a' && c <= 'z') {
            val = c - 'a' + 10;
        } else { // '<' or invalid chars count as 0
            val = 0;
        }
        sum += val * weights[i % 3];
    }
    return sum % 10;
}

WASM_EXPORT
int verify_check_digit(const char* str, int len, char expected_check) {
    if (expected_check == '<' || expected_check == ' ') {
        // Filler check digit
        return 1;
    }
    int calculated = calculate_mrz_check_digit(str, len);
    int expected = expected_check - '0';
    return calculated == expected ? 1 : 0;
}

// Convert ICAO 6-digit YYMMDD date to ISO YYYY-MM-DD format
static void format_icao_date(const char* yymmdd, char* out_date, int is_dob) {
    if (!yymmdd || str_len(yymmdd) < 6) {
        out_date[0] = '\0';
        return;
    }
    int yy = (yymmdd[0] - '0') * 10 + (yymmdd[1] - '0');
    int mm = (yymmdd[2] - '0') * 10 + (yymmdd[3] - '0');
    int dd = (yymmdd[4] - '0') * 10 + (yymmdd[5] - '0');

    int year = 2000 + yy;
    if (is_dob && yy > 28) {
        year = 1900 + yy;
    }

    // Format YYYY-MM-DD
    out_date[0] = '0' + (year / 1000);
    out_date[1] = '0' + ((year / 100) % 10);
    out_date[2] = '0' + ((year / 10) % 10);
    out_date[3] = '0' + (year % 10);
    out_date[4] = '-';
    out_date[5] = '0' + (mm / 10);
    out_date[6] = '0' + (mm % 10);
    out_date[7] = '-';
    out_date[8] = '0' + (dd / 10);
    out_date[9] = '0' + (dd % 10);
    out_date[10] = '\0';
}

// Lookup 3-letter ISO country code
static const char* lookup_country_name(const char* code) {
    if (code[0] == 'U' && code[1] == 'S' && code[2] == 'A') return "United States";
    if (code[0] == 'G' && code[1] == 'B' && code[2] == 'R') return "United Kingdom";
    if (code[0] == 'C' && code[1] == 'A' && code[2] == 'N') return "Canada";
    if (code[0] == 'D' && code[1] == 'E' && code[2] == 'U') return "Germany";
    if (code[0] == 'F' && code[1] == 'R' && code[2] == 'A') return "France";
    if (code[0] == 'I' && code[1] == 'N' && code[2] == 'D') return "India";
    if (code[0] == 'A' && code[1] == 'U' && code[2] == 'S') return "Australia";
    if (code[0] == 'J' && code[1] == 'P' && code[2] == 'N') return "Japan";
    if (code[0] == 'C' && code[1] == 'H' && code[2] == 'N') return "China";
    if (code[0] == 'B' && code[1] == 'R' && code[2] == 'A') return "Brazil";
    if (code[0] == 'E' && code[1] == 'S' && code[2] == 'P') return "Spain";
    if (code[0] == 'I' && code[1] == 'T' && code[2] == 'A') return "Italy";
    if (code[0] == 'M' && code[1] == 'E' && code[2] == 'X') return "Mexico";
    if (code[0] == 'N' && code[1] == 'L' && code[2] == 'D') return "Netherlands";
    if (code[0] == 'S' && code[1] == 'G' && code[2] == 'P') return "Singapore";
    return "International";
}

// Parse ICAO TD3 MRZ (2 lines of 44 characters)
// Line 1: P<USASTEVENS<<JOHN<EDWARD<<<<<<<<<<<<<<<<<<<
// Line 2: 9900000148USA8501017M2512319<<<<<<<<<<<<<<02
WASM_EXPORT
int parse_td3_mrz(const char* line1, const char* line2, char* out_json) {
    if (!line1 || !line2 || str_len(line1) < 44 || str_len(line2) < 44) {
        return 0;
    }

    char doc_type[4] = {0};
    doc_type[0] = line1[0];
    if (line1[1] != '<') doc_type[1] = line1[1];
    
    char issuing_state[4] = {0};
    issuing_state[0] = line1[2];
    issuing_state[1] = line1[3];
    issuing_state[2] = line1[4];

    // Names in Line 1 (pos 5 to 43)
    char raw_names[40] = {0};
    for (int i = 0; i < 39; i++) raw_names[i] = line1[5 + i];
    
    char surname[40] = {0};
    char given_names[40] = {0};
    
    // Find "<<" separator between surname and given names
    int sep_idx = -1;
    for (int i = 0; i < 38; i++) {
        if (raw_names[i] == '<' && raw_names[i+1] == '<') {
            sep_idx = i;
            break;
        }
    }

    if (sep_idx != -1) {
        for (int i = 0; i < sep_idx; i++) surname[i] = raw_names[i];
        for (int i = sep_idx + 2; i < 39; i++) given_names[i - (sep_idx + 2)] = raw_names[i];
    } else {
        str_copy(surname, raw_names, 40);
    }

    replace_fillers_with_spaces(surname);
    trim_trailing_fillers(surname);
    replace_fillers_with_spaces(given_names);
    trim_trailing_fillers(given_names);

    // Line 2 Fields:
    // Passport Number: pos 0..8 (9 chars)
    char passport_num[10] = {0};
    for (int i = 0; i < 9; i++) passport_num[i] = line2[i];
    char passport_num_check = line2[9];
    int pass_num_valid = verify_check_digit(passport_num, 9, passport_num_check);

    // Nationality: pos 10..12 (3 chars)
    char nationality[4] = {0};
    nationality[0] = line2[10];
    nationality[1] = line2[11];
    nationality[2] = line2[12];

    // Date of Birth: pos 13..18 (6 chars)
    char raw_dob[7] = {0};
    for (int i = 0; i < 6; i++) raw_dob[i] = line2[13 + i];
    char dob_check = line2[19];
    int dob_valid = verify_check_digit(raw_dob, 6, dob_check);
    char formatted_dob[12] = {0};
    format_icao_date(raw_dob, formatted_dob, 1);

    // Sex / Gender: pos 20
    char sex[2] = {0};
    sex[0] = (line2[20] == '<') ? 'U' : line2[20];

    // Expiry Date: pos 21..26 (6 chars)
    char raw_expiry[7] = {0};
    for (int i = 0; i < 6; i++) raw_expiry[i] = line2[21 + i];
    char expiry_check = line2[27];
    int expiry_valid = verify_check_digit(raw_expiry, 6, expiry_check);
    char formatted_expiry[12] = {0};
    format_icao_date(raw_expiry, formatted_expiry, 0);

    // Personal Number / Optional data: pos 28..41 (14 chars)
    char personal_num[15] = {0};
    for (int i = 0; i < 14; i++) personal_num[i] = line2[28 + i];
    char personal_num_check = line2[42];
    int personal_valid = verify_check_digit(personal_num, 14, personal_num_check);

    // Composite Check Digit: pos 43
    // Composite calculates check digit over passport_num + check + raw_dob + check + raw_expiry + check + personal_num + check
    char composite_buf[36] = {0};
    int c_idx = 0;
    for (int i = 0; i < 10; i++) composite_buf[c_idx++] = line2[i]; // passport_num + check
    for (int i = 0; i < 7; i++) composite_buf[c_idx++] = line2[13 + i]; // raw_dob + check
    for (int i = 0; i < 7; i++) composite_buf[c_idx++] = line2[21 + i]; // raw_expiry + check
    for (int i = 0; i < 15; i++) composite_buf[c_idx++] = line2[28 + i]; // personal_num + check
    
    char composite_check = line2[43];
    int composite_valid = verify_check_digit(composite_buf, c_idx, composite_check);

    const char* issuing_country_name = lookup_country_name(issuing_state);
    const char* nationality_country_name = lookup_country_name(nationality);

    int total_checks = pass_num_valid + dob_valid + expiry_valid + composite_valid;
    int confidence = (total_checks * 20) + 20; // 20% to 100%

    // Build JSON String manual construct into out_json
    // We construct a valid JSON string
    int pos = 0;
    #define APPEND(s) { const char* p = s; while (*p) out_json[pos++] = *p++; }
    
    APPEND("{\"valid\":true,\"mrzType\":\"TD3\",\"docType\":\"");
    APPEND(doc_type);
    APPEND("\",\"docTypeFull\":\"Passport\",\"issuingCountry\":\"");
    APPEND(issuing_state);
    APPEND("\",\"issuingCountryName\":\"");
    APPEND(issuing_country_name);
    APPEND("\",\"surname\":\"");
    APPEND(surname);
    APPEND("\",\"givenNames\":\"");
    APPEND(given_names);
    APPEND("\",\"passportNumber\":\"");
    
    // Clean passport number (remove '<')
    char clean_pass[10] = {0};
    str_copy(clean_pass, passport_num, 10);
    replace_fillers_with_spaces(clean_pass);
    trim_trailing_fillers(clean_pass);
    APPEND(clean_pass);
    
    APPEND("\",\"passportNumberValid\":");
    APPEND(pass_num_valid ? "true" : "false");
    APPEND(",\"nationality\":\"");
    APPEND(nationality);
    APPEND("\",\"nationalityName\":\"");
    APPEND(nationality_country_name);
    APPEND("\",\"dob\":\"");
    APPEND(formatted_dob);
    APPEND("\",\"dobValid\":");
    APPEND(dob_valid ? "true" : "false");
    APPEND(",\"sex\":\"");
    APPEND(sex);
    APPEND("\",\"expiryDate\":\"");
    APPEND(formatted_expiry);
    APPEND("\",\"expiryValid\":");
    APPEND(expiry_valid ? "true" : "false");
    APPEND(",\"compositeValid\":");
    APPEND(composite_valid ? "true" : "false");
    APPEND(",\"confidence\":");
    
    // Append confidence integer
    char conf_str[8] = {0};
    conf_str[0] = '0' + (confidence / 100);
    if (confidence >= 100) {
        conf_str[0] = '1'; conf_str[1] = '0'; conf_str[2] = '0'; conf_str[3] = '\0';
    } else {
        conf_str[0] = '0' + (confidence / 10);
        conf_str[1] = '0' + (confidence % 10);
        conf_str[2] = '\0';
    }
    APPEND(conf_str);
    APPEND("}");
    
    out_json[pos] = '\0';
    return pos;
}

// Parse ICAO TD1 MRZ (3 lines of 30 characters)
WASM_EXPORT
int parse_td1_mrz(const char* line1, const char* line2, const char* line3, char* out_json) {
    if (!line1 || !line2 || !line3 || str_len(line1) < 30 || str_len(line2) < 30 || str_len(line3) < 30) {
        return 0;
    }

    char doc_type[4] = {0};
    doc_type[0] = line1[0];
    if (line1[1] != '<') doc_type[1] = line1[1];

    char issuing_state[4] = {0};
    issuing_state[0] = line1[2];
    issuing_state[1] = line1[3];
    issuing_state[2] = line1[4];

    // Doc Number pos 5..13 (9 chars)
    char doc_num[10] = {0};
    for (int i = 0; i < 9; i++) doc_num[i] = line1[5 + i];
    char doc_num_check = line1[14];
    int doc_num_valid = verify_check_digit(doc_num, 9, doc_num_check);

    // Line 2: DOB pos 0..5 (6 chars)
    char raw_dob[7] = {0};
    for (int i = 0; i < 6; i++) raw_dob[i] = line2[i];
    char dob_check = line2[6];
    int dob_valid = verify_check_digit(raw_dob, 6, dob_check);
    char formatted_dob[12] = {0};
    format_icao_date(raw_dob, formatted_dob, 1);

    // Sex pos 7
    char sex[2] = {0};
    sex[0] = (line2[7] == '<') ? 'U' : line2[7];

    // Expiry pos 8..13 (6 chars)
    char raw_expiry[7] = {0};
    for (int i = 0; i < 6; i++) raw_expiry[i] = line2[8 + i];
    char expiry_check = line2[14];
    int expiry_valid = verify_check_digit(raw_expiry, 6, expiry_check);
    char formatted_expiry[12] = {0};
    format_icao_date(raw_expiry, formatted_expiry, 0);

    // Nationality pos 15..17 (3 chars)
    char nationality[4] = {0};
    nationality[0] = line2[15];
    nationality[1] = line2[16];
    nationality[2] = line2[17];

    // Line 3: Name pos 0..29
    char raw_names[32] = {0};
    for (int i = 0; i < 30; i++) raw_names[i] = line3[i];

    char surname[32] = {0};
    char given_names[32] = {0};
    int sep_idx = -1;
    for (int i = 0; i < 29; i++) {
        if (raw_names[i] == '<' && raw_names[i+1] == '<') {
            sep_idx = i;
            break;
        }
    }
    if (sep_idx != -1) {
        for (int i = 0; i < sep_idx; i++) surname[i] = raw_names[i];
        for (int i = sep_idx + 2; i < 30; i++) given_names[i - (sep_idx + 2)] = raw_names[i];
    } else {
        str_copy(surname, raw_names, 30);
    }

    replace_fillers_with_spaces(surname);
    trim_trailing_fillers(surname);
    replace_fillers_with_spaces(given_names);
    trim_trailing_fillers(given_names);

    const char* issuing_country_name = lookup_country_name(issuing_state);
    const char* nationality_country_name = lookup_country_name(nationality);

    int total_checks = doc_num_valid + dob_valid + expiry_valid;
    int confidence = (total_checks * 25) + 25; // 25% to 100%

    int pos = 0;
    #define APPEND_TD1(s) { const char* p = s; while (*p) out_json[pos++] = *p++; }

    APPEND_TD1("{\"valid\":true,\"mrzType\":\"TD1\",\"docType\":\"");
    APPEND_TD1(doc_type);
    APPEND_TD1("\",\"docTypeFull\":\"Identity Card\",\"issuingCountry\":\"");
    APPEND_TD1(issuing_state);
    APPEND_TD1("\",\"issuingCountryName\":\"");
    APPEND_TD1(issuing_country_name);
    APPEND_TD1("\",\"surname\":\"");
    APPEND_TD1(surname);
    APPEND_TD1("\",\"givenNames\":\"");
    APPEND_TD1(given_names);
    APPEND_TD1("\",\"passportNumber\":\"");

    char clean_doc[10] = {0};
    str_copy(clean_doc, doc_num, 10);
    replace_fillers_with_spaces(clean_doc);
    trim_trailing_fillers(clean_doc);
    APPEND_TD1(clean_doc);

    APPEND_TD1("\",\"passportNumberValid\":");
    APPEND_TD1(doc_num_valid ? "true" : "false");
    APPEND_TD1(",\"nationality\":\"");
    APPEND_TD1(nationality);
    APPEND_TD1("\",\"nationalityName\":\"");
    APPEND_TD1(nationality_country_name);
    APPEND_TD1("\",\"dob\":\"");
    APPEND_TD1(formatted_dob);
    APPEND_TD1("\",\"dobValid\":");
    APPEND_TD1(dob_valid ? "true" : "false");
    APPEND_TD1(",\"sex\":\"");
    APPEND_TD1(sex);
    APPEND_TD1("\",\"expiryDate\":\"");
    APPEND_TD1(formatted_expiry);
    APPEND_TD1("\",\"expiryValid\":");
    APPEND_TD1(expiry_valid ? "true" : "false");
    APPEND_TD1(",\"confidence\":");

    char conf_str[8] = {0};
    if (confidence >= 100) {
        conf_str[0] = '1'; conf_str[1] = '0'; conf_str[2] = '0'; conf_str[3] = '\0';
    } else {
        conf_str[0] = '0' + (confidence / 10);
        conf_str[1] = '0' + (confidence % 10);
        conf_str[2] = '\0';
    }
    APPEND_TD1(conf_str);
    APPEND_TD1("}");

    out_json[pos] = '\0';
    return pos;
}
