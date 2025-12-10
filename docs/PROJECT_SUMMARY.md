# Payment Modernization Token Migration - Project Summary

## Project Overview

This project is a **Payment Token Migration** initiative to migrate payment tokens from **Moneris** vault to **Mastercard** (Payment Gateway) tokens. The migration affects multiple Rogers billing systems and requires building new microservices while reusing existing CIP (Cash Integration Platform) services.

---

## Key Objectives

1. **Migrate existing Moneris payment tokens** to Mastercard gateway tokens across all billing systems
2. **Maintain PCI DSS compliance** throughout the migration process
3. **Enable real-time tokenization** for new transactions via API Gateway
4. **Create centralized audit, reporting, and fallout management**

---

## Migration Types

| Type | Description |
|------|-------------|
| **Mass Migration** | File-based bulk migration of saved payment tokens (2026-2027) |
| **Delta Migration** | File-based incremental migration for new/changed tokens |
| **Real-time Tokenization** | API-based token conversion on-demand when PG token is missing |

---

## Source Billing Systems (In-Scope)

- **WinOnline Media** - GUID-based entities
- **V21 MACC** - BAN-based entities
- **TSC** - Customer account number-based entities
- *(Future: SuperSystem, Admin3, Maestro)*

---

## Components to Build/Modify

### 1. Payment Hub (Azure) - NEW

**Migration Microservice** (Azure Functions):

| Function | Purpose |
|----------|---------|
| Token File Processor - Upload File | Receive files from blob storage, validate, load to staging tables |
| Token File Processor - Validate Tokens | Validate against Payment Hub DB, apply dedup rules |
| Token File Processor - Create Batch | Create batch metadata based on validated tokens |
| Token Processor - FileGen | Generate Mastercard input files from staging |
| Token Processor - BatchManager | Orchestrate batch creation and worker assignment |
| Token Processor - BatchWorker | Execute batch migration, call SSG/RTMM, update Payment Hub |
| Audit and Control | Monitor batches, trigger retries, send notifications |
| Generate Billing Mapping File | Create response files for billing systems |

**PHUB Token Management Microservice** (AKS):
- Real-time tokenization API
- Lookup existing tokens or invoke PG Tokenization service

### 2. CIP On-Prem (PCI Zone) - NEW

**PG Dispatcher Microservice**:
- Wraps Mastercard batch & real-time APIs
- APIs: `createPgtoken`, `submitBatch`, `getBatchStatus`, `getBatchResult`
- Reuses code patterns from existing TNDispatcher

**PG Tokenization Microservice**:
- Combines TSI + BPS logic
- Calls TNDispatcher for Moneris de-tokenization
- Calls PGDispatcher for Mastercard tokenization
- Exposed through SSG

### 3. Existing Services to Reuse

- **TNDispatcher** - Moneris vault communication (already exists)
- **TSI, BPS, BPS-SCHEDULER, CS-PROCESS** - Existing batch processing logic (code reuse)

---

## New Database Tables Required

| Table | Purpose |
|-------|---------|
| `MONERIS_TOKENS_STAGING` | Staging for input Moneris tokens with migration status |
| `PG_TOKENS_STAGING` | Staging for Mastercard tokens and responses |
| `MIGRATION_ERROR_DETAILS` | Error details per file/batch/token |
| `TOKEN_MIGRATION_BATCH` | Track each file and batch for reporting |
| `TOKEN_MIGRATION_WORKERS` | Track all token processor workers |
| `TOKEN_MIGRATION_AUDIT_LOG` | JSON-based audit logging |

---

## File Formats

### Input File (from Billing Systems)

```
MONERIS_TOKEN, EXP_DATE, ENTITY_ID, ENTITY_TYPE, ENTITY_STS,
CREATION_DATE, LAST_USE_DATE, TRX_SEQ_NO, BUSINESS_UNIT
```

**Naming Convention:** `{SOURCE_ID}.{TYPE}.{YYYYMMDD}.{NNNN}.input`

- SOURCE_ID: V21, WINM (WinOnline Media), TSC, etc.
- TYPE: P (payment tokens), T (transactional history), I (ID tokens)

### Output File (to Billing Systems)

```
MONERIS_TOKEN, EXP_DATE, ENTITY_ID, ENTITY_REF_TYPE, PMR,
CARD_BRAND, FIRST_SIX, LAST_FOUR, FUNDING_METHOD
```

**Naming Convention:** `{SOURCE_ID}.{TYPE}.{YYYYMMDD}.{NNNN}.output`

---

## Key Technical Constraints

1. **PCI Compliance**: All PAN handling must remain in on-prem CDE zone
2. **Mastercard Batch Limits**: Max 3MB per batch (~18,000 records)
3. **No PAN in logs/database** in Azure environment
4. **Zero downtime** migration implementation required
5. **Configurable throttling** for batch sizes per billing system

---

## Use Cases Summary

| UC | Description |
|----|-------------|
| UC-01 | Mass/Delta Migration - Validate Moneris tokens |
| UC-02 | Mass Migration - Execute migration |
| UC-03 | Delta Migration - Execute with RTMM simulator |
| UC-04 | Real-time Tokenization via Payment Hub API |
| UC-05 | Delta Migration via SSG endpoint |
| UC-06 | Real-time Tokenization via SSG endpoint |
| UC-07 | View migration progress/error reporting |
| UC-08 | Validate against Payment Hub DB |
| UC-09/10 | Retry failed transactions |
| UC-12 | Apply validation rules before batch creation |

---

## What This Repository Provides

Based on the existing codebase:

| Service | Status | Notes |
|---------|--------|-------|
| TNDispatcher | **Complete** | Reuse for Moneris communication |
| TSI | **Complete** | SOAP proxy pattern to reuse |
| BPS | **Complete** | Batch processing logic to reuse |
| CS-PROCESS | **Missing** | Not in repo - needed for de-tokenization |
| PG Dispatcher | **To Build** | New - wrap Mastercard APIs |
| PG Tokenization | **To Build** | New - combine TSI+BPS patterns |
| Migration Microservice | **To Build** | New - Azure Functions |
| PHUB Token Management | **To Build** | New - AKS microservice |

---

## Immediate Development Tasks

1. **Build PG Dispatcher** - Mastercard API wrapper (similar to TNDispatcher)
2. **Build PG Tokenization Service** - Combine TSI/BPS patterns for SSG exposure
3. **Build Azure Functions** for Token File Processor and Audit/Control
4. **Create new database tables** for staging and migration tracking
5. **Implement file validation rules** (detailed in DDD)
6. **Set up SSG integration** for PHUB → CIP communication
7. **Establish network connectivity** from PCI on-prem to Mastercard DC

---

## Architecture Flow

### Mass Migration Flow
```
Billing System → Blob Storage → Token File Processor → Validate →
Create Batch → FileGen → Mastercard Batch API → Response →
Update Payment Hub DB → Generate Response File → Billing System
```

### Delta Migration Flow
```
Billing System → Blob Storage → Token File Processor → Validate →
BatchManager → BatchWorker → SSG → PG Tokenization →
TNDispatcher (Moneris) → PGDispatcher (Mastercard) →
Update Payment Hub DB → Generate Response File
```

### Real-time Tokenization Flow
```
Payment Hub API → PHUB Token Management MS → SSG →
PG Tokenization → TNDispatcher → PGDispatcher →
Update Payment Hub DB → Return PG Token
```

---

## Error Handling

### File-Level Errors (Reject & Stop)
- File validation error (schema, size, checksum)
- Decryption or parsing error
- Failure to insert records in database
- 100% API failure for first 5 batches

### Token-Level Errors (Log & Continue)
- Token validation errors (format, duplicates, missing fields)
- Token exists in PMR_MONERIS_MAPPING
- PG Token exists in TOKENIZED_CARD
- Moneris/Mastercard API timeout for specific batch

### Notifications
- Email sent at: Start of migration, Failure, End of process
- Statistics included from TOKEN_MIGRATION_BATCH tables

---

## Out of Scope

- Real-time throttling adjustment during migration
- Pause/Resume batch functionality
- Manual parallel executor adjustment during runtime

---

## References

- High Level Design Document: `High+Level+Design+Document+for+Payment+Modernization+Token+Migration-YDDev1.doc.docx`
- Sample Wave 1 Execution Flow: `Sample Wave 1 Execution Flow.xlsx`
- Payment Method Table Design: `PaymentMethod_Table_design.local.xlsx`
