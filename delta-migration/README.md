# Delta Migration - Azure Functions

Azure Functions for Payment Token Delta Migration from Moneris to Mastercard via PG Tokenization service.

## Overview

Unlike the mass-migration which uses file-based batch processing through Mastercard's batch API, the delta migration uses **real-time API calls** through the CDE services:

1. **PG Tokenization Service** - Orchestrates the migration
2. **TN Dispatcher** - De-tokenizes Moneris tokens to get PANs
3. **PG Dispatcher** - Creates Mastercard PG tokens

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Azure Functions (Delta)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│   │  uploadFile  │────▶│ validateTok  │────▶│ createBatch  │        │
│   │  (blob)      │     │ (queue)      │     │ (queue)      │        │
│   └──────────────┘     └──────────────┘     └──────────────┘        │
│                                                    │                 │
│                                                    ▼                 │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│   │ auditControl │     │ generateBill │◀────│ batchWorker  │        │
│   │ (timer)      │     │ (queue/http) │     │ (queue)      │        │
│   └──────────────┘     └──────────────┘     └──────────────┘        │
│                                                    │                 │
└────────────────────────────────────────────────────┼─────────────────┘
                                                     │
                                    HTTP (real-time) │
                                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          CDE Services (Spring Boot)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │                   PG Tokenization (7070)                  │      │
│   │                                                           │      │
│   │   1. Receive batch of Moneris tokens                     │      │
│   │   2. Call TN Dispatcher to de-tokenize (get PAN)         │      │
│   │   3. Call PG Dispatcher to create MC token               │      │
│   │   4. Return results                                       │      │
│   └───────────────────────┬───────────────────┬──────────────┘      │
│                           │                   │                      │
│              ┌────────────▼───────┐   ┌──────▼───────────┐          │
│              │ TN Dispatcher (7050)│   │ PG Dispatcher    │          │
│              │ (Moneris vault)    │   │ (7080)            │          │
│              └────────────────────┘   └──────────────────┘          │
│                       │                        │                     │
└───────────────────────┼────────────────────────┼─────────────────────┘
                        │                        │
            ┌───────────▼───────────┐  ┌────────▼────────────┐
            │ Moneris Vault         │  │ Mastercard API      │
            │ (or monerismock:7051) │  │ (or mastercardmock: │
            └───────────────────────┘  │  7061)              │
                                       └─────────────────────┘
```

## Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `uploadFileDelta` | Blob (delta-input/{source}/{name}) | Parses CSV, inserts tokens to staging |
| `validateTokensDelta` | Queue (delta-validate-tokens) | Validates token format, checks duplicates |
| `createBatchDelta` | Queue (delta-create-batch) | Splits tokens into batches (~500 each) |
| `batchWorkerDelta` | Queue (delta-batch-worker) | **Calls PG Tokenization API** for each batch |
| `generateBillingFileDelta` | Queue (delta-generate-output) | Creates output CSV with migrated tokens |
| `generateBillingFileHttp` | HTTP (GET/POST /delta/billing/generate) | Manual trigger for output generation |
| `auditControlDelta` | Timer (every 5 min) | Monitors batches, handles timeouts |

## Key Difference from Mass Migration

| Aspect | Mass Migration | Delta Migration |
|--------|----------------|-----------------|
| **API Call** | File-based batch to Mastercard | Real-time HTTP to PG Tokenization |
| **Processing** | Offline batch processing | Near real-time processing |
| **Volume** | Large files (millions of tokens) | Smaller incremental batches |
| **Latency** | Hours to days | Minutes |
| **Use Case** | Initial migration | Daily delta sync |

## Setup

### Prerequisites

- Node.js >= 20.0.0
- Azure Functions Core Tools v4
- Azure Storage Account (or Azurite for local development)
- SQL Server database
- CDE Services running (PG Tokenization, TN Dispatcher, PG Dispatcher)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure local settings:**
   ```bash
   cp local.settings.json.example local.settings.json
   # Edit local.settings.json with your values
   ```

3. **Start Azurite (local storage emulator):**
   ```bash
   npx azurite --silent --location .azurite --debug .azurite/debug.log
   ```

4. **Start CDE services:**
   ```bash
   # Start TN Dispatcher (port 7050) with Moneris mock (port 7051)
   cd ../CDE-CIP-TNDISPATCHER-0700-main
   mvn spring-boot:run -pl server

   # Start PG Dispatcher (port 7080) with Mastercard mock (port 7061)
   cd ../CDE-CIP-PGDISPATCHER-0700-main
   mvn spring-boot:run -pl server

   # Start PG Tokenization (port 7070)
   cd ../CDE-CIP-PGTOKENIZATION-0700-main
   mvn spring-boot:run
   ```

5. **Run the functions:**
   ```bash
   npm run start
   ```

### Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `SQL_SERVER` | SQL Server hostname | `localhost` |
| `SQL_DATABASE` | Database name | `tokenmigration` |
| `SQL_USER` | Database user | `sa` |
| `SQL_PASSWORD` | Database password | `YourPassword` |
| `PG_TOKENIZATION_URL` | PG Tokenization service URL | `http://localhost:7070` |
| `DEFAULT_BATCH_SIZE` | Tokens per batch | `500` |
| `DEFAULT_MERCHANT_ID` | Merchant ID for tokenization | `SBX_ROGERS` |

## Database Schema

The delta migration uses the same base tables as mass-migration plus additional tables:

- `MONERIS_TOKENS_STAGING` - Input tokens (shared)
- `PG_TOKENS_STAGING` - Output tokens (shared)
- `TOKEN_MIGRATION_BATCH` - File tracking (shared, FILE_TYPE='DELTA')
- `TOKEN_MIGRATION_AUDIT_LOG` - Audit logs (shared)
- `DELTA_MIGRATION_BATCH` - Delta-specific batch tracking
- `DELTA_TOKEN_RESULTS` - Individual token results
- `DELTA_API_CALLS` - API call audit log

Run the delta schema:
```bash
sqlcmd -S localhost -d tokenmigration -i infra/scripts/delta-schema.sql
```

## Input File Format

Same CSV format as mass-migration:

```csv
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT
9518050018246830,0139,E10001,1,O,20240115,20241201,,
```

Upload to: `delta-input/{SOURCE_ID}/{filename}.csv`

Example: `delta-input/V21/delta_20250113.csv`

## Output File Format

```csv
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_REF_TYPE,PMR,CARD_BRAND,FIRST_SIX,LAST_FOUR,FUNDING_METHOD
9518050018246830,0139,E10001,1,MC1234567890,MASTERCARD,512345,1234,CREDIT
```

Output stored in: `billing-output/{SOURCE_ID}/{filename}.output.csv`

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Test (Local)

1. Start all services (Azurite, SQL, CDE services)
2. Upload a test file:
   ```bash
   az storage blob upload \
     --connection-string "UseDevelopmentStorage=true" \
     --container-name delta-input \
     --name V21/test.csv \
     --file test-data/sample.csv
   ```
3. Monitor function logs
4. Check output in `billing-output` container

## Deployment

### Azure Infrastructure

The delta-migration shares infrastructure with mass-migration. See `infra/` for Terraform configuration.

### Deploy Functions

```bash
func azure functionapp publish <FUNCTION_APP_NAME> --typescript
```

## Monitoring

### Application Insights Queries

```kusto
// Recent delta migration errors
traces
| where message contains "Delta Migration"
| where severityLevel >= 3
| order by timestamp desc
| take 50

// Batch processing times
customMetrics
| where name == "BatchProcessingTime"
| summarize avg(value), max(value), count() by bin(timestamp, 5m)
```

## Troubleshooting

### Common Issues

1. **"PG Tokenization service unavailable"**
   - Check PG Tokenization service is running on configured URL
   - Verify network connectivity from Azure Functions

2. **"Batch timeout - marked as failed"**
   - Check CDE service logs for errors
   - Increase timeout threshold in audit control if needed

3. **"Token validation failed"**
   - Verify token format (16 digits, starts with 9)
   - Check entity type (must be 1 or 2)

### Logs Location

- Azure Functions: Application Insights
- CDE Services: Spring Boot logs (console or file)
- Database: TOKEN_MIGRATION_AUDIT_LOG table
