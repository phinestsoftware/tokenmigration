# Token Migration - Manual Testing Guide

This guide explains how to manually test the Token Migration system through Azure Portal.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Test File Format](#test-file-format)
3. [Upload Test File](#upload-test-file)
4. [Monitor Processing](#monitor-processing)
5. [Verify Results](#verify-results)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Azure Portal Access
You need access to the following Azure resources:
- **Resource Group:** `rg-tokenmigration-dev`
- **Storage Account:** `sttokenmigoqt29j`
- **SQL Database:** `sqldb-tokenmigration-dev` on server `sql-tokenmigration-dev-oqt29j`
- **Application Insights:** `appi-tokenmigration-dev`

### Required Roles
- **Storage Blob Data Contributor** - to upload files
- **SQL DB Contributor** or database reader access - to query results

### Tools
- Azure Portal (https://portal.azure.com)
- SQL Server Management Studio (SSMS) or Azure Data Studio for database queries
- Text editor to create CSV files

---

## Test File Format

### File Naming Convention
```
{SOURCE}_{TYPE}_{YYYYMMDD}_{HHMMSS}.csv
```

**Examples:**
- `V21_P_20251211_143000.csv`
- `WINM_P_20251211_150000.csv`
- `TSC_P_20251211_160000.csv`

**Source IDs:**
| Source ID | Description |
|-----------|-------------|
| V21 | V21 Billing System |
| WINM | WinOnline Media |
| TSC | TSC System |

### CSV Structure

**Header Row (Required):**
```
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT
```

**Data Rows:**
```
9518050018246830,0139,E10001,1,O,20240115,20241201,,
9518050018246831,0625,E10002,1,O,20240220,20241115,,
9518050018246832,1226,E10003,2,O,20230510,20241105,,
```

### Field Specifications

| Field | Format | Valid Values | Description |
|-------|--------|--------------|-------------|
| MONERIS_TOKEN | 16 digits | Must start with `9` | The Moneris payment token |
| EXP_DATE | MMYY | 0101-1299 | Card expiration date |
| ENTITY_ID | Up to 36 chars | Any string | Account number or GUID |
| ENTITY_TYPE | Single digit | `1` = Account, `2` = GUID | Type of entity |
| ENTITY_STS | Single char | `O` = Open, `S` = Suspended, `N` = New, `C` = Closed | Entity status |
| CREATION_DATE | YYYYMMDD | Valid date | When token was created |
| LAST_USE_DATE | YYYYMMDD | Valid date | Last transaction date |
| TRX_SEQ_NO | String | Optional | Transaction sequence |
| BUSINESS_UNIT | String | Optional | Business unit code |

### Sample Test File

Create a file named `V21_P_20251211_143000.csv`:

```csv
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT
9518050018246830,0139,E10001,1,O,20240115,20241201,,
9518050018246831,0625,E10002,1,O,20240220,20241115,,
9518050018246832,1226,E10003,2,O,20230510,20241105,,
```

### Validation Rules (Important!)

Your test data must follow these rules or tokens will be marked INVALID:

| Rule | Requirement | Error if Violated |
|------|-------------|-------------------|
| Token Format | Exactly 16 numeric digits | E001, E002 |
| Token Prefix | Must start with `9` | E003 |
| Entity Type | Must be `1` or `2` only | E009 |
| Entity Status | Must be `O`, `S`, `N`, or `C` | E010 |
| Expiry Date | Format MMYY, valid month (01-12) | E004 |
| Date Format | YYYYMMDD (no dashes) | Parsing error |

**Common Mistakes:**
- Using `C` for entity type (should be `1` or `2`)
- Using dates with dashes (`2024-01-15` instead of `20240115`)
- Token not starting with `9`

---

## Upload Test File

### Step 1: Navigate to Storage Account

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for `sttokenmigoqt29j` in the search bar
3. Click on the Storage Account

### Step 2: Open Storage Browser

1. In the left menu, click **Storage browser**
2. Expand **Blob containers**
3. Click on **billing-input**

### Step 3: Create Source Folder (if needed)

The file MUST be uploaded to a subfolder matching the source ID:

1. If folder doesn't exist, click **+ Add Directory**
2. Enter the source folder name (e.g., `V21`, `WINM`, or `TSC`)
3. Click **Create**

### Step 4: Upload File

1. Click into your source folder (e.g., `V21`)
2. Click **Upload** button
3. Click **Browse for files** and select your CSV file
4. Click **Upload**

**Correct path:** `billing-input/V21/V21_P_20251211_143000.csv`

**WRONG path:** `billing-input/V21_P_20251211_143000.csv` (missing subfolder!)

### Step 5: Verify Upload

After upload, you should see:
- File listed in the folder
- File size > 0 bytes
- Last modified timestamp updated

---

## Monitor Processing

### Option 1: Application Insights (Recommended)

1. Go to Azure Portal
2. Search for `appi-tokenmigration-dev`
3. Click **Logs** in the left menu
4. Run this query to see recent activity:

```kusto
traces
| where timestamp > ago(30m)
| where message contains "FILE_" or message contains "Processing" or message contains "Batch"
| project timestamp, message
| order by timestamp desc
| take 50
```

### Option 2: Function App Logs

1. Search for `func-tokenmigration-dev-oqt29j`
2. Click **Log stream** in the left menu
3. Watch for real-time logs

### Expected Log Sequence

After uploading a file, you should see these messages in order:

| Order | Message | Meaning |
|-------|---------|---------|
| 1 | `Processing billing file` | File detected by blob trigger |
| 2 | `File parsed` | CSV parsed successfully |
| 3 | `Moneris tokens loaded to staging` | Tokens inserted to database |
| 4 | `Validation completed: X valid, Y invalid` | Token validation done |
| 5 | `Batch metadata created` | Batching calculated |
| 6 | `MC input file generated` | Mastercard file created |
| 7 | `Mock MC response file uploaded` | (Dev only) Mock response created |
| 8 | `PG tokens ready in staging` | PG tokens loaded |
| 9 | `Batch X completed: N success, M failures` | Processing done |
| 10 | `Migration completed` | All batches finished |

### Processing Time

- Small files (< 100 tokens): ~30-60 seconds
- Medium files (100-1000 tokens): ~1-2 minutes
- Large files (> 1000 tokens): ~2-5 minutes

---

## Verify Results

### Database Tables to Check

Connect to the SQL database using these credentials:
- **Server:** `sql-tokenmigration-dev-oqt29j.database.windows.net`
- **Database:** `sqldb-tokenmigration-dev`
- **Username:** `sqladmin`
- **Password:** (ask your admin)

### Query 1: Check Batch Status

```sql
SELECT
    BATCH_ID,
    FILE_NAME,
    STATUS,
    TOTAL_TOKEN_COUNT,
    VALID_TOKEN_COUNT,
    SUCCESS_COUNT,
    FAILURE_COUNT,
    CREATED_AT,
    PROCESS_END_TIME
FROM TOKEN_MIGRATION_BATCH
ORDER BY CREATED_AT DESC;
```

**Expected Status Values:**
| Status | Meaning |
|--------|---------|
| PENDING | File received, waiting for processing |
| PROCESSING | Currently being processed |
| COMPLETED | All tokens processed successfully |
| FAILED | Processing completed with some/all failures |

### Query 2: Check Token Validation Status

```sql
SELECT
    VALIDATION_STATUS,
    COUNT(*) as Count
FROM MONERIS_TOKENS_STAGING
WHERE FILE_ID = 'FILE_XXXXXXXXX'  -- Replace with your FILE_ID
GROUP BY VALIDATION_STATUS;
```

**Expected Values:**
| Status | Meaning |
|--------|---------|
| VALID | Token passed all validation rules |
| INVALID | Token failed validation (check error code) |
| DUPLICATE | Token already exists in system |

### Query 3: Check Migration Status

```sql
SELECT
    MIGRATION_STATUS,
    COUNT(*) as Count
FROM MONERIS_TOKENS_STAGING
WHERE FILE_ID = 'FILE_XXXXXXXXX'
GROUP BY MIGRATION_STATUS;
```

**Expected Values:**
| Status | Meaning |
|--------|---------|
| PENDING | Waiting for batch processing |
| COMPLETED | Successfully migrated with PMR assigned |
| FAILED | Migration failed (check ERROR_CODE) |

### Query 4: View Individual Token Results

```sql
SELECT TOP 10
    MONERIS_TOKEN,
    VALIDATION_STATUS,
    MIGRATION_STATUS,
    ERROR_CODE,
    PMR,
    UPDATED_AT
FROM MONERIS_TOKENS_STAGING
WHERE FILE_ID = 'FILE_XXXXXXXXX'
ORDER BY ID;
```

### Query 5: Check PG Token Responses (Mastercard)

```sql
SELECT
    MONERIS_TOKEN,
    PG_TOKEN,
    CARD_BRAND,
    RESULT,
    ERROR_CAUSE
FROM PG_TOKENS_STAGING
WHERE FILE_ID = 'FILE_XXXXXXXXX';
```

**Card Brand Values:**
| Code | Brand |
|------|-------|
| V | Visa |
| M | Mastercard |
| A | American Express |

### Query 6: View Audit Trail

```sql
SELECT
    MESSAGE_CODE,
    MESSAGE_TEXT,
    CREATED_AT
FROM TOKEN_MIGRATION_AUDIT_LOG
WHERE FILE_ID = 'FILE_XXXXXXXXX'
ORDER BY CREATED_AT ASC;
```

### Query 7: Check Errors

```sql
SELECT
    MONERIS_TOKEN,
    ERROR_CODE,
    ERROR_MESSAGE,
    CREATED_AT
FROM MIGRATION_ERROR_DETAILS
WHERE FILE_ID = 'FILE_XXXXXXXXX';
```

**Common Error Codes:**
| Code | Meaning |
|------|---------|
| E001 | Token contains non-numeric characters |
| E002 | Token is not 16 digits |
| E003 | Token doesn't start with 9 |
| E004 | Invalid expiry date format |
| E009 | Invalid entity type (must be 1 or 2) |
| E010 | Invalid entity status |
| NO_PG_TOKEN | No Mastercard response received |

### Finding Your FILE_ID

If you don't know the FILE_ID, find it by filename:

```sql
SELECT FILE_ID, FILE_NAME, CREATED_AT
FROM TOKEN_MIGRATION_BATCH
WHERE FILE_NAME LIKE '%20251211%'  -- Use your date
ORDER BY CREATED_AT DESC;
```

---

## Check Output Files

After successful migration, output files are generated:

### Navigate to Output Container

1. Go to Storage Account `sttokenmigoqt29j`
2. Open **Storage browser** > **Blob containers**
3. Click **billing-output**

### Output File Types

| Folder | File Type | Contents |
|--------|-----------|----------|
| `{source}/success/` | `.output` | Successfully migrated tokens |
| `{source}/failure/` | `.failure` | Failed tokens with error details |

### Output File Format

**Success file columns:**
```
MONERIS_TOKEN,PG_TOKEN,PMR,CARD_BRAND,FIRST_SIX,LAST_FOUR,EXP_DATE,STATUS
```

**Failure file columns:**
```
MONERIS_TOKEN,ERROR_CODE,ERROR_MESSAGE,STATUS
```

---

## Troubleshooting

### File Not Processing

**Symptom:** File uploaded but no logs appear

**Check:**
1. File is in correct path: `billing-input/{SOURCE}/filename.csv`
2. File has correct extension: `.csv`
3. File has valid CSV header
4. Function App is running (check Function App overview)

### All Tokens Invalid

**Symptom:** 100% validation failures

**Check:**
1. Token format: 16 digits, starts with `9`
2. Entity type: Must be `1` or `2` (not letters)
3. Entity status: Must be `O`, `S`, `N`, or `C`
4. Dates: Format `YYYYMMDD` without dashes

### Tokens Stuck at PENDING

**Symptom:** Tokens validated but never complete migration

**Check:**
1. Application Insights for errors
2. Queue messages (ask admin to check)
3. Function App logs for exceptions

### No PG Tokens

**Symptom:** `NO_PG_TOKEN` error for all tokens

**Check:**
1. In dev environment, `MOCK_MASTERCARD_ENABLED` should be `true`
2. Check `mastercard-mapping` container for `.mc.response` file
3. Check if `uploadFileMastercard` function is running

---

## Test Scenarios

### Scenario 1: Happy Path (All Valid)

Create file with 3 valid tokens:
```csv
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT
9100000000000001,1226,ENT001,1,O,20240101,20241201,,
9100000000000002,0627,ENT002,1,O,20240215,20241115,,
9100000000000003,0328,ENT003,2,O,20240310,20241001,,
```

**Expected Result:**
- All 3 tokens: VALID
- All 3 tokens: COMPLETED
- All 3 tokens assigned PMR
- Success file generated

### Scenario 2: Mixed Valid/Invalid

Create file with mix of valid and invalid tokens:
```csv
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT
9200000000000001,1226,ENT001,1,O,20240101,20241201,,
8200000000000002,0627,ENT002,1,O,20240215,20241115,,
9200000000000003,0328,ENT003,C,O,20240310,20241001,,
```

**Expected Result:**
- Token 1: VALID, COMPLETED
- Token 2: INVALID (E003 - doesn't start with 9)
- Token 3: INVALID (E009 - entity type 'C' invalid)
- Both success and failure files generated

### Scenario 3: Duplicate Detection

1. First, upload a file with token `9300000000000001`
2. Wait for completion
3. Upload another file with same token `9300000000000001`

**Expected Result:**
- Second file: Token marked as DUPLICATE
- No PMR assigned (already exists)

---


## Quick Reference Card

### Upload Path
```
billing-input/{SOURCE}/{FILENAME}.csv
```

### Check Status Query
```sql
SELECT FILE_ID, STATUS, SUCCESS_COUNT, FAILURE_COUNT
FROM TOKEN_MIGRATION_BATCH
WHERE CREATED_AT > DATEADD(hour, -1, GETUTCDATE())
ORDER BY CREATED_AT DESC;
```

### Check Token Results Query
```sql
SELECT VALIDATION_STATUS, MIGRATION_STATUS, COUNT(*)
FROM MONERIS_TOKENS_STAGING
WHERE FILE_ID = 'YOUR_FILE_ID'
GROUP BY VALIDATION_STATUS, MIGRATION_STATUS;
```

### Key URLs
- Azure Portal: https://portal.azure.com
- Storage Account: `sttokenmigoqt29j`
- Function App: `func-tokenmigration-dev-oqt29j`
- App Insights: `appi-tokenmigration-dev`
