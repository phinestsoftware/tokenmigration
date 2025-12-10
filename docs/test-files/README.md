# Test Files for Token Migration

This folder contains sample test files for Mass Migration testing.

## File Naming Convention

- **Input from Billing:** `{SOURCE_ID}.{TYPE}.{YYYYMMDD}.{NNNN}.input`
- **Output to Mastercard:** `{SOURCE_ID}.{TYPE}.{YYYYMMDD}.{NNNN}.mc.input`
- **Response from Mastercard:** `{SOURCE_ID}.{TYPE}.{YYYYMMDD}.{NNNN}.mc.response`
- **Output to Billing (success):** `{SOURCE_ID}.{TYPE}.{YYYYMMDD}.{NNNN}.output`
- **Output to Billing (failure):** `{SOURCE_ID}.{TYPE}.{YYYYMMDD}.{NNNN}.failure`

Where:
- SOURCE_ID: V21, WINM, TSC, etc.
- TYPE: P (payment tokens), T (transactional history), I (ID tokens)

---

## 1. Input Files from Billing Systems

### V21.P.20251208.0001.input
Sample input file from V21 billing system with 10 Moneris tokens.

### WINM.P.20251208.0001.input
Sample input file from WinOnline Media with GUID-based entity IDs.

### TSC.P.20251208.0001.input
Sample input file from TSC with customer account numbers.

**Format:**
```
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT
```

| Field | Format | Description |
|-------|--------|-------------|
| MONERIS_TOKEN | 16 digits, starts with 9 | Moneris token |
| EXP_DATE | MMYY | Expiration date |
| ENTITY_ID | Up to 36 chars | Account number or GUID |
| ENTITY_TYPE | 1=Account, 2=GUID | Entity type |
| ENTITY_STS | O/S/N/C | Open/Suspended/Cancelled/Closed |
| CREATION_DATE | YYYYMMDD | Token creation date |
| LAST_USE_DATE | YYYYMMDD | Last use date |
| TRX_SEQ_NO | - | N/A for payment tokens |
| BUSINESS_UNIT | - | N/A for bulk migration |

**Trailer:** `TRANSACTION_COUNT,TIMESTAMP`

---

## 2. Output File to Mastercard

### V21.P.20251208.0001.mc.input
Generated file sent to Mastercard for token conversion.

**Format:**
```
MONERIS_TOKEN,EXP_DATE_MM,EXP_DATE_YY
```

**Trailer:** `BU={BU},SOURCE_ID={SOURCE},TRANSACTION_COUNT={COUNT},TIMESTAMP={TS}`

---

## 3. Response File from Mastercard

### V21.P.20251208.0001.mc.response
Response file received from Mastercard after batch processing.

**Format:**
```
apiOperation,correlationId,sourceOfFunds.type,sourceOfFunds.provided.card.number,
sourceOfFunds.provided.card.expiry.month,sourceOfFunds.provided.card.expiry.year,
result,error.cause,error.explanation,error.field,error.supportCode,error.validationType,
token,schemeToken.status,sourceOfFunds.provided.card.fundingMethod,
sourceOfFunds.provided.card.expiry,sourceOfFunds.provided.card.scheme
```

| Field | Description |
|-------|-------------|
| correlationId | Original Moneris token (for mapping) |
| sourceOfFunds.provided.card.number | Masked card (first 6 + last 4) |
| result | SUCCESS or FAILURE |
| error.* | Error details if FAILURE |
| token | New PG/Gateway token (starts with 9) |
| schemeToken.status | PROVISIONING |
| sourceOfFunds.provided.card.fundingMethod | CREDIT/DEBIT |
| sourceOfFunds.provided.card.scheme | VISA/MASTERCARD/AMEX |

---

## 4. Output Files to Billing Systems

### V21.P.20251208.0001.output (Success)
Response file sent back to billing system with successful migrations.

**Format:**
```
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_REF_TYPE,PMR,CARD_BRAND,FIRST_SIX,LAST_FOUR,FUNDING_METHOD
```

| Field | Format | Description |
|-------|--------|-------------|
| PMR | 16 digits, starts with 8 | Payment Method Reference |
| CARD_BRAND | V/M/A | Visa/Mastercard/Amex |
| FIRST_SIX | 6 digits | BIN |
| LAST_FOUR | 4 digits | Last 4 of card |
| FUNDING_METHOD | CREDIT/DEBIT/CHARGE | Card type |

### V21.P.20251208.0001.failure (Failures)
Response file with failed token migrations.

**Format:**
```
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_REF_TYPE,ERROR_CODE,ERROR_DESCRIPTION
```

---

## Test Scenarios Covered

| Token | Scenario | Expected Result |
|-------|----------|-----------------|
| 9518050018246830 | Valid Mastercard | SUCCESS |
| 9518050018246831 | Valid Visa | SUCCESS |
| 9518050018246832 | Valid Visa Debit | SUCCESS |
| 9518050018246833 | Suspended account | SUCCESS |
| 9518050018246834 | Valid Amex | SUCCESS |
| 9518050018246835 | Valid Mastercard | SUCCESS |
| 9518050018246836 | Invalid card (Luhn check) | FAILURE |
| 9518050018246837 | Valid Visa Debit | SUCCESS |
| 9518050018246838 | Valid Mastercard | SUCCESS |
| 9518050018246839 | Expired card | FAILURE |

---

## Usage

1. Place billing input files in: `billing/input/{source}/`
2. System generates MC input file to: `mastercard/input/`
3. Mastercard returns response to: `mastercard/mapping/`
4. System generates output files to: `billing/output/{source}/success/` and `billing/output/{source}/failure/`
