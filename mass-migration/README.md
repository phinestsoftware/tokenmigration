# Mass Migration - Token Migration Azure Functions

Azure Functions project for migrating payment tokens from Moneris to Mastercard (Payment Gateway).

## Overview

This project implements the Mass Migration flow for the Payment Modernization Token Migration initiative. It processes files from billing systems (V21, WinOnline Media, TSC), validates tokens, generates Mastercard input files, processes responses, and generates billing output files.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ Billing Systems │────▶│ Azure Blob       │────▶│ Upload File         │
│ (V21/WINM/TSC)  │     │ billing-input/   │     │ Function            │
└─────────────────┘     └──────────────────┘     └─────────┬───────────┘
                                                           │
                                                           ▼
                        ┌──────────────────┐     ┌─────────────────────┐
                        │ Queue:           │◀────│ Validate Tokens     │
                        │ validate-tokens  │     │ Function            │
                        └──────────────────┘     └─────────┬───────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ Mastercard      │◀────│ Azure Blob       │◀────│ File Gen            │
│ (Offline)       │     │ mastercard-input/│     │ Function            │
└────────┬────────┘     └──────────────────┘     └─────────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ MC Response     │────▶│ Azure Blob       │────▶│ Upload File         │
│                 │     │ mastercard-map/  │     │ Function            │
└─────────────────┘     └──────────────────┘     └─────────┬───────────┘
                                                           │
                                                           ▼
                        ┌──────────────────┐     ┌─────────────────────┐
                        │ Batch Manager    │────▶│ Batch Worker        │
                        │ Function         │     │ Functions           │
                        └──────────────────┘     └─────────┬───────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ Billing Systems │◀────│ Azure Blob       │◀────│ Generate Billing    │
│                 │     │ billing-output/  │     │ File Function       │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
```

## Prerequisites

- Node.js 20 LTS
- Azure Functions Core Tools v4
- Azure CLI
- Terraform >= 1.5.0
- Azure subscription

## Project Structure

```
mass-migration/
├── src/
│   ├── functions/           # Azure Functions
│   │   ├── uploadFile.ts
│   │   ├── validateTokens.ts
│   │   ├── createBatch.ts
│   │   ├── fileGen.ts
│   │   ├── batchManager.ts
│   │   ├── batchWorker.ts
│   │   ├── auditControl.ts
│   │   └── generateBillingFile.ts
│   ├── services/            # Business logic
│   │   ├── database.ts
│   │   ├── blobStorage.ts
│   │   ├── queueService.ts
│   │   ├── validationService.ts
│   │   ├── emailService.ts
│   │   └── mastercard/
│   │       └── mockService.ts
│   ├── models/              # Data models
│   │   ├── monerisToken.ts
│   │   ├── pgToken.ts
│   │   └── migrationBatch.ts
│   ├── utils/               # Utilities
│   │   ├── fileParser.ts
│   │   └── logger.ts
│   └── config/
│       └── index.ts
├── tests/                   # Test files
├── infra/                   # Terraform IaC
│   ├── main.tf
│   ├── variables.tf
│   ├── modules/
│   └── scripts/
│       ├── schema.sql
│       └── deploy.sh
├── package.json
├── tsconfig.json
└── host.json
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Local Development

```bash
# Start Azurite (local Azure Storage emulator)
npx azurite --silent --location ./azurite --debug ./azurite/debug.log

# Start local SQL Server (Docker)
docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=YourPassword123!' \
  -p 1433:1433 --name sql1 -d mcr.microsoft.com/mssql/server:2022-latest

# Apply database schema
sqlcmd -S localhost -U sa -P 'YourPassword123!' -i infra/scripts/schema.sql

# Start Azure Functions locally
npm start
```

### 3. Run Tests

```bash
npm test
npm run test:coverage
```

### 4. Deploy to Azure

```bash
# Initialize and deploy infrastructure
cd infra
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply

# Deploy function app
cd ..
npm run build
func azure functionapp publish <function-app-name>
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SQL_SERVER` | SQL Server hostname | localhost |
| `SQL_DATABASE` | Database name | TokenMigration |
| `SQL_USER` | SQL username | - |
| `SQL_PASSWORD` | SQL password | - |
| `STORAGE_CONNECTION_STRING` | Azure Storage connection | - |
| `DEFAULT_BATCH_SIZE` | Tokens per batch | 1000 |
| `FAILURE_THRESHOLD_PERCENT` | Max failure % before rejection | 50 |
| `MOCK_MASTERCARD_ENABLED` | Enable MC mock (dev only) | false |

### File Naming Convention

**Input:** `{SOURCE_ID}.{TYPE}.{YYYYMMDD}.{NNNN}.input`
- SOURCE_ID: V21, WINM, TSC
- TYPE: P (payment), T (transactional), I (ID)

**Output:** `{SOURCE_ID}.{TYPE}.{YYYYMMDD}.{NNNN}.output`

## Azure Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| uploadFile | Blob | Process incoming files |
| validateTokens | Queue | Validate token format and check duplicates |
| createBatch | Queue | Create batch metadata |
| fileGen | Queue | Generate Mastercard input file |
| batchManager | Queue | Assign batches and queue workers |
| batchWorker | Queue | Process individual batch |
| auditControl | Timer (5min) | Monitor batches, send notifications |
| generateBillingFile | Queue/HTTP | Generate output files |

## Database Tables

| Table | Purpose |
|-------|---------|
| MONERIS_TOKENS_STAGING | Input tokens with status |
| PG_TOKENS_STAGING | MC response tokens |
| TOKEN_MIGRATION_BATCH | File/batch tracking |
| TOKEN_MIGRATION_AUDIT_LOG | Audit trail |
| MIGRATION_ERROR_DETAILS | Error tracking |
| TOKEN_MIGRATION_WORKERS | Worker status |
| MIGRATION_CONFIG | Configuration |

## API Endpoints

### Generate Billing File (Manual)

```
GET/POST /api/billing/generate?sourceId=V21&fileId=V21.P.20251208.0001
```

## Monitoring

- Application Insights for logs and metrics
- Audit logs in TOKEN_MIGRATION_AUDIT_LOG table
- Email notifications for start/completion/failure

## Testing

```bash
# Unit tests
npm test

# Coverage report
npm run test:coverage

# Lint
npm run lint
```

## Troubleshooting

### Common Issues

1. **File not processing**: Check blob trigger is configured correctly
2. **Validation failures**: Review MIGRATION_ERROR_DETAILS table
3. **Stale batches**: auditControl marks batches as failed after 30 minutes

### Logs

```bash
# Local logs
func logs --name <function-name>

# Azure logs (requires Application Insights)
az monitor app-insights query --app <app-insights-name> \
  --analytics-query "traces | where timestamp > ago(1h)"
```

## License

Internal Rogers use only.
