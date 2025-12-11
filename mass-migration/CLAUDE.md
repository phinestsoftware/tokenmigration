# CLAUDE.md - Mass Migration Project

## Project Overview
Azure Functions-based token migration service for Rogers. Processes billing files containing Moneris tokens and migrates them to Payment Hub with PG tokens from Mastercard.

## Debugging Best Practices

### IMPORTANT: Always Check Error Logs First!
When something doesn't work in Azure Functions:

1. **Check Application Insights exceptions IMMEDIATELY:**
```bash
az monitor app-insights query \
  --app appi-tokenmigration-dev \
  --resource-group rg-tokenmigration-dev \
  --analytics-query "exceptions | where timestamp > ago(30m) | project timestamp, outerMessage, innermostMessage | order by timestamp desc | take 20" \
  --output json | jq -r '.tables[0].rows[]?'
```

2. **Check function execution traces:**
```bash
az monitor app-insights query \
  --app appi-tokenmigration-dev \
  --resource-group rg-tokenmigration-dev \
  --analytics-query "traces | where timestamp > ago(10m) | where message contains 'error' or message contains 'failed' | project timestamp, message, severityLevel | order by timestamp desc | take 30" \
  --output json | jq -r '.tables[0].rows[]?'
```

3. **Check for "Failed" executions:**
```bash
az monitor app-insights query \
  --app appi-tokenmigration-dev \
  --resource-group rg-tokenmigration-dev \
  --analytics-query "traces | where message contains 'Failed' | order by timestamp desc | take 10" --output json
```

## Important: Keep Azure & Terraform in Sync!
**EVERY TIME** you change settings in Azure via CLI (az commands), you **MUST** also update the corresponding Terraform files. Otherwise, the next `terraform apply` will revert your changes!

Examples:
- Changed Node version? Update `infra/modules/function-app/main.tf` → `node_version`
- Added app settings? Update `app_settings` block in Terraform
- Changed SKU? Update Terraform

## Common Issues and Fixes

### Issue 1: "crypto is not defined" Error
**Symptom:** Queue messages fail to send with `ReferenceError: crypto is not defined`
**Cause:** Azure Functions Node 18 runtime doesn't have global `crypto.randomUUID()`
**Fix:** Upgrade to Node 20:
```bash
az functionapp config set --name <function-app-name> --resource-group <rg> --linux-fx-version "Node|20"
```
Also update Terraform `node_version = "~20"` in function-app module.

### Issue 2: Bulk Insert BCP Column Type Error
**Symptom:** `Invalid column type from bcp client for colid 1`
**Cause:** mssql bulk insert has issues with date/datetime column type mappings
**Fix:** Use parameterized INSERT statements instead of bulkInsert for complex column types

### Issue 3: SQL Configuration Missing
**Symptom:** `Configuration validation failed: SQL_SERVER: Required`
**Cause:** Function App needs individual SQL settings, not just connection string
**Fix:** Add these app settings: `SQL_SERVER`, `SQL_DATABASE`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ENCRYPT`, `SQL_TRUST_SERVER_CERTIFICATE`

## Build and Deploy Commands

```bash
# Build TypeScript
npm run build

# Deploy to Azure
func azure functionapp publish func-tokenmigration-dev-oqt29j --typescript --force

# Restart after config changes
az functionapp restart --name func-tokenmigration-dev-oqt29j --resource-group rg-tokenmigration-dev
```

## Infrastructure Commands

```bash
# Deploy infrastructure
cd infra
terraform init
terraform plan -var-file=terraform.tfvars -out=tfplan
terraform apply tfplan
```

## Database Connection Test

```javascript
// Quick test script - save as /tmp/test-db.cjs
const sql = require('/Users/gurvindersingh/rogers/mass-migration/node_modules/mssql');
const config = {
  user: 'sqladmin',
  password: '<password>',
  server: 'sql-tokenmigration-dev-oqt29j.database.windows.net',
  database: 'sqldb-tokenmigration-dev',
  options: { encrypt: true, trustServerCertificate: false }
};
sql.connect(config).then(pool => {
  return pool.request().query('SELECT COUNT(*) as count FROM MONERIS_TOKENS_STAGING');
}).then(result => console.log(result.recordset));
```

## Input File Format

### File Naming Convention
- **Input:** `{SOURCE_ID}.{TYPE}.{YYYYMMDD}.{NNNN}.input` or `{SOURCE}_{TYPE}_{YYYYMMDD}_{HHMMSS}.csv`
- **Source IDs:** V21, WINM (WinOnline Media), TSC
- **Type:** P (payment tokens), T (transactional history), I (ID tokens)

### CSV Format
```
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT
9518050018246830,0139,E10001,1,O,20240115,20241201,,
```

### Field Validation Rules

| Field | Format | Valid Values | Error Code |
|-------|--------|--------------|------------|
| MONERIS_TOKEN | 16 digits | Must start with `9` | E001 (not numeric), E002 (not 16 digits), E003 (wrong prefix) |
| EXP_DATE | MMYY | Valid month/year | E004 (invalid format) |
| ENTITY_ID | Up to 36 chars | Account number or GUID | E006 (required) |
| ENTITY_TYPE | 1 digit | `1` (Account) or `2` (GUID) | E009 (invalid type) |
| ENTITY_STS | 1 char | `O`/`S`/`N`/`C` (Open/Suspended/Cancelled/Closed) | E010 (invalid status) |
| CREATION_DATE | YYYYMMDD | Valid date | - |
| LAST_USE_DATE | YYYYMMDD | Valid date | - |

### Sample Test File (from /Users/gurvindersingh/rogers/docs/test-files/)
```csv
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT
9518050018246830,0139,E10001,1,O,20240115,20241201,,
9518050018246831,0625,E10002,1,O,20240220,20241115,,
9518050018246832,1226,E10003,2,O,20230510,20241105,,
9518050018246833,0328,E10004,1,S,20240101,20241001,,
9518050018246834,0927,E10005,1,O,20240315,20241210,,
```

### Trailer Line
Format: `{TRANSACTION_COUNT},{TIMESTAMP}` (e.g., `0000001033,20251208141500`)

## Function Flow
1. **uploadFileBilling** (blob trigger) → loads file to staging
2. **validateTokens** (queue) → validates tokens
3. **createBatch** (queue) → calculates batch metadata
4. **fileGen** (queue) → generates Mastercard input file
5. **batchManager** (queue) → assigns tokens to batches
6. **batchWorker** (queue) → processes each batch
7. **generateBillingFile** (queue/HTTP) → generates output files

## Azure Resources
- Resource Group: `rg-tokenmigration-dev`
- Function App: `func-tokenmigration-dev-oqt29j`
- Storage: `sttokenmigoqt29j`
- SQL Server: `sql-tokenmigration-dev-oqt29j`
- SQL Database: `sqldb-tokenmigration-dev`
- App Insights: `appi-tokenmigration-dev`
