# CLAUDE.md - Mass Migration Project

## Project Overview
Azure Functions-based token migration service for Rogers. Processes billing files containing Moneris tokens and migrates them to Payment Hub with PG tokens from Mastercard.

## Design Documents

### High Level Design (HLD)
- **Location:** `/Users/gurvindersingh/projects/rogers/tokenmigration/docs/High+Level+Design+Document+for+Payment+Modernization+Token+Migration-YDDev1.doc.docx`
- **Description:** Overall architecture, use cases, data flow diagrams, and infrastructure requirements for the entire token migration solution
- **Key sections:** Solution Summary (section 1.3), Use Cases (section 1.4), Data Architecture (section 2.5), Azure Functions overview (section 3.6.1)

### Detailed Design Document (DDD)
- **Location:** `/Users/gurvindersingh/projects/rogers/tokenmigration/docs/deatiled_design_mass-migration_Jan13_2026.md`
- **Description:** Technical implementation details specific to the mass-migration Azure Functions project
- **Key sections:**
  - Token File Processor functions (Upload File, Validate Tokens, Create Batch)
  - Token Processor functions (fileGen, BatchManager, BatchWorker)
  - Input/output file formats and validation rules
  - Error handling and test scenarios
- **Note:** Large file (~510KB) - use grep/search to find specific sections

## Debugging Best Practices

### IMPORTANT: Always Check Error Logs First!
When something doesn't work in Azure Functions:

**Step 0: First, discover the correct App Insights name (it may change after Terraform/pipeline deployments):**
```bash
# Get the App Insights resource name dynamically
APP_INSIGHTS=$(az resource list --resource-group rg-tokenmigration-dev --resource-type "Microsoft.Insights/components" --query "[0].name" -o tsv)
echo "App Insights name: $APP_INSIGHTS"
```

1. **Check Application Insights exceptions IMMEDIATELY:**
```bash
APP_INSIGHTS=$(az resource list --resource-group rg-tokenmigration-dev --resource-type "Microsoft.Insights/components" --query "[0].name" -o tsv)
az monitor app-insights query \
  --app "$APP_INSIGHTS" \
  --resource-group rg-tokenmigration-dev \
  --analytics-query "exceptions | where timestamp > ago(30m) | project timestamp, outerMessage, innermostMessage | order by timestamp desc | take 20" \
  --output json | jq -r '.tables[0].rows[]?'
```

2. **Check function execution traces:**
```bash
APP_INSIGHTS=$(az resource list --resource-group rg-tokenmigration-dev --resource-type "Microsoft.Insights/components" --query "[0].name" -o tsv)
az monitor app-insights query \
  --app "$APP_INSIGHTS" \
  --resource-group rg-tokenmigration-dev \
  --analytics-query "traces | where timestamp > ago(10m) | where message contains 'error' or message contains 'failed' | project timestamp, message, severityLevel | order by timestamp desc | take 30" \
  --output json | jq -r '.tables[0].rows[]?'
```

3. **Check for "Failed" executions:**
```bash
APP_INSIGHTS=$(az resource list --resource-group rg-tokenmigration-dev --resource-type "Microsoft.Insights/components" --query "[0].name" -o tsv)
az monitor app-insights query \
  --app "$APP_INSIGHTS" \
  --resource-group rg-tokenmigration-dev \
  --analytics-query "traces | where message contains 'Failed' | order by timestamp desc | take 10" --output json
```

## CRITICAL: All Infrastructure Changes via Terraform Only!

**NEVER** make infrastructure changes directly via Azure CLI or Azure Portal. **ALWAYS** use Terraform.

### Why?
- Direct Azure changes get **overwritten** on next `terraform apply`
- Terraform is the source of truth for infrastructure
- Changes via CLI cause drift and debugging nightmares

### How to make infrastructure changes:
1. Edit the appropriate Terraform file in `infra/` or `infra/modules/`
2. Run `terraform plan` to preview changes
3. Run `terraform apply` to apply changes

### Common Terraform files:
| Change | File |
|--------|------|
| Function App settings | `infra/modules/function-app/main.tf` → `app_settings` |
| Node version | `infra/modules/function-app/main.tf` → `node_version` |
| Storage containers/queues | `infra/modules/storage/main.tf` |
| SQL database settings | `infra/modules/sql-database/main.tf` |
| Event Grid subscriptions | `infra/modules/storage/main.tf` |
| App Insights | `infra/modules/application-insights/main.tf` |

### Exception: Debugging only
The only acceptable use of `az` CLI for changes is **temporary debugging** (e.g., disabling a function temporarily). Even then, revert manually or via Terraform after debugging.

## Common Issues and Fixes

### Issue 1: "crypto is not defined" Error
**Symptom:** Queue messages fail to send with `ReferenceError: crypto is not defined`
**Cause:** Azure Functions Node 18 runtime doesn't have global `crypto.randomUUID()`
**Fix:** Update `infra/modules/function-app/main.tf`:
```hcl
node_version = "~20"
```
Then run `terraform apply`.

### Issue 2: Bulk Insert BCP Column Type Error
**Symptom:** `Invalid column type from bcp client for colid 1`
**Cause:** mssql bulk insert has issues with date/datetime column type mappings
**Fix:** Use parameterized INSERT statements instead of bulkInsert for complex column types

### Issue 3: SQL Configuration Missing
**Symptom:** `Configuration validation failed: SQL_SERVER: Required`
**Cause:** Function App needs individual SQL settings, not just connection string
**Fix:** Add to `infra/modules/function-app/main.tf` in the `app_settings` block:
```hcl
SQL_SERVER                    = var.sql_server_fqdn
SQL_DATABASE                  = var.sql_database_name
SQL_USER                      = var.sql_admin_username
SQL_PASSWORD                  = var.sql_admin_password
SQL_ENCRYPT                   = "true"
SQL_TRUST_SERVER_CERTIFICATE  = "false"
```
Then run `terraform apply`.

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
1. **uploadFileBilling** (blob trigger) → loads file to staging (small files)
   **uploadFileEventGrid** (HTTP trigger) → loads file via streaming (large files - Event Grid)
2. **validateTokens** (queue) → validates tokens
3. **createBatch** (queue) → calculates batch metadata
4. **fileGen** (queue) → generates Mastercard input file, triggers mock (dev)
5. **uploadFileMastercard** (blob trigger) → processes MC response, loads PG tokens
   **uploadFileEventGrid** (HTTP trigger) → processes MC response via streaming (large files)
6. **batchManager** (queue) → assigns tokens to batches
7. **batchWorker** (queue) → processes each batch, joins Moneris + PG tokens
8. **generateBillingFile** (queue/HTTP) → generates output files

## Large File Processing (Event Grid + HTTP Trigger)

For files larger than ~500MB, the blob trigger runs out of memory because it loads the entire file into memory before passing it to our code. The solution is to use Event Grid + HTTP trigger which allows streaming.

### How it works
1. Event Grid monitors blob storage for new files
2. When a file is uploaded, Event Grid sends a notification to our HTTP endpoint
3. Our code opens a **stream** to the blob (doesn't load into memory)
4. CSV is parsed row-by-row as data streams in
5. Records are inserted to database in batches of 5000

### Event Grid Setup (Automatic via Terraform)
Event Grid is automatically created by Terraform (`infra/modules/event-grid/main.tf`).

The Terraform creates:
- Event Grid System Topic on the storage account
- Subscription for `billing-input` container → `/api/upload/event-grid`
- Subscription for `mastercard-mapping` container → `/api/upload/event-grid`

### Disable Blob Triggers (for large file processing)
When using Event Grid for large files, disable blob triggers to avoid double-processing.

Add to `infra/modules/function-app/main.tf` in the `app_settings` block:
```hcl
"AzureWebJobs.uploadFileBilling.Disabled"    = "true"
"AzureWebJobs.uploadFileMastercard.Disabled" = "true"
```
Then run `terraform apply`.

To re-enable, remove those lines and run `terraform apply` again.

## Mock Mastercard Flow (Dev Environment)

When `MOCK_MASTERCARD_ENABLED=true`:
1. `fileGen` generates MC input file
2. `fileGen` calls mock service which uploads `.mc.response` file to blob storage
3. `uploadFileMastercard` blob trigger fires and processes the response file
4. PG tokens are inserted to `PG_TOKENS_STAGING` table
5. `fileGen` polls database until PG tokens are ready (max 30 seconds)
6. `batchManager` and `batchWorker` proceed with migration

This tests the **actual production code path** - only the file source differs.

## Azure Resources
**Note:** Resource names may change after Terraform/pipeline deployments. Always discover names dynamically when possible.

- Resource Group: `rg-tokenmigration-dev`
- Function App: Discover with `az functionapp list --resource-group rg-tokenmigration-dev --query "[0].name" -o tsv`
- Storage: Discover with `az storage account list --resource-group rg-tokenmigration-dev --query "[0].name" -o tsv`
- SQL Server: Discover with `az sql server list --resource-group rg-tokenmigration-dev --query "[0].name" -o tsv`
- SQL Database: `sqldb-tokenmigration-dev`
- App Insights: Discover with `az resource list --resource-group rg-tokenmigration-dev --resource-type "Microsoft.Insights/components" --query "[0].name" -o tsv`

## Testing Scripts

### IMPORTANT: Blob Trigger Path Requirements
The `uploadFileBilling` blob trigger expects files in path: `billing-input/{source}/{name}`
- Files MUST be in a subfolder (e.g., `billing-input/V21/filename.csv`)
- Files at root level (`billing-input/filename.csv`) will NOT trigger the function

### Upload Test File
Use the upload script to avoid common mistakes (permissions, wrong paths):
```bash
# Generate and upload a test file with random token prefix
./scripts/upload-test-file.sh

# Generate with specific token prefix (e.g., 9750)
./scripts/upload-test-file.sh --generate 9750

# Upload an existing file
./scripts/upload-test-file.sh /path/to/myfile.csv
```

The script:
- Gets connection string from Function App (avoids permission errors)
- Uploads to correct path with source folder (`billing-input/V21/...`)
- Shows the token prefix to search for in verification

### Verify Migration Results
```bash
# Check results by token prefix
node scripts/verify-migration.js 9750

# Check results by FILE_ID
node scripts/verify-migration.js FILE_1234567890
```

### Query Database for Debugging
Use `scripts/query-db.js` to investigate bugs by querying the database directly:

```bash
# Get token details for a file
node scripts/query-db.js tokens V21.P.20260114.0001

# Get validation/migration status summary
node scripts/query-db.js status V21.P.20260114.0001

# Get error details
node scripts/query-db.js errors V21.P.20260114.0001

# Get audit log trail
node scripts/query-db.js audit V21.P.20260114.0001

# Get duplicate tokens
node scripts/query-db.js duplicates V21.P.20260114.0001

# Get batch info
node scripts/query-db.js batch V21.P.20260114.0001

# Get PG tokens from Mastercard response
node scripts/query-db.js pg-tokens V21.P.20260114.0001

# Get recent batches (no parameter needed)
node scripts/query-db.js recent-batches

# Check PMR mapping for a specific token
node scripts/query-db.js pmr-mapping 9518050018246830

# Run custom SQL query
node scripts/query-db.js custom "SELECT TOP 10 * FROM MONERIS_TOKENS_STAGING WHERE VALIDATION_STATUS = 'INVALID'"
```

**Available queries:**
| Query | Description |
|-------|-------------|
| `tokens` | Get first 20 tokens for a FILE_ID with validation/migration status |
| `status` | Summary counts grouped by VALIDATION_STATUS and MIGRATION_STATUS |
| `errors` | Error details from MIGRATION_ERROR_DETAILS table |
| `audit` | Audit log entries in chronological order |
| `duplicates` | Tokens marked as DUPLICATE |
| `batch` | Batch records from TOKEN_MIGRATION_BATCH |
| `pg-tokens` | PG tokens from Mastercard response |
| `recent-batches` | Last 20 batch records (no parameter needed) |
| `pmr-mapping` | Check PMR_MONERIS_MAPPING for a Moneris token |
| `custom` | Run any custom SQL query |

### Common Testing Mistakes to Avoid
1. **Wrong upload path** - Always use `billing-input/{source}/filename` not `billing-input/filename`
2. **Permission errors with `--auth-mode login`** - Use connection string instead (the script handles this)
3. **Old code running after deploy** - Run `az functionapp restart` after deploying
4. **Blob trigger not firing** - Check if file was already processed (blob receipts). Use unique filenames.
