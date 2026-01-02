# ID Generation Algorithms

## Overview

This document describes all auto-generated identifier algorithms used in the Mass Migration system. The system generates various types of IDs for files, batches, workers, and payment references.

---

## 1. File ID Generation

**Source:** `src/models/migrationBatch.ts` (lines 148-155)

### Algorithm

```typescript
export function generateFileId(fileName: string): string {
  const parsed = parseFileName(fileName);
  if (parsed) {
    return `${parsed.sourceId}.${parsed.tokenType}.${parsed.date}.${parsed.sequence}`;
  }
  // Fallback: use timestamp
  return `FILE_${Date.now()}`;
}
```

### Parsing Pattern

Files must match regex: `^([A-Z0-9]+)\.([PTI])\.(\d{8})\.(\d{4})\.(\w+)$`

### Components

1. **Source ID**: Alphanumeric identifier for token source (e.g., "V21")
2. **Token Type**: Single character - P (Production), T (Test), or I (Integration)
3. **Date**: 8-digit date in YYYYMMDD format
4. **Sequence**: 4-digit sequence number with leading zeros

### Format

```
{SOURCE_ID}.{TYPE}.{DATE}.{SEQUENCE}
```

### Examples

| Input Filename | Generated File ID |
|----------------|-------------------|
| `V21.P.20251208.0001.input` | `V21.P.20251208.0001` |
| `V21.T.20251209.0025.input` | `V21.T.20251209.0025` |
| `INVALID_NAME.txt` | `FILE_1735890123456` |

### Fallback Behavior

If filename doesn't match pattern, generates: `FILE_` + Unix timestamp (milliseconds)

---

## 2. Batch ID Generation

**Source:** `src/models/migrationBatch.ts` (lines 160-162)

### Algorithm

```typescript
export function generateBatchId(fileId: string, batchNumber: number): string {
  return `${fileId}.B${String(batchNumber).padStart(4, '0')}`;
}
```

### Components

1. **File ID**: The complete file identifier (from File ID generation)
2. **Batch Number**: Sequential batch number starting from 1, padded to 4 digits

### Format

```
{FILE_ID}.B{BATCH_NUMBER}
```

### Examples

| File ID | Batch Number | Generated Batch ID |
|---------|--------------|-------------------|
| `V21.P.20251208.0001` | 1 | `V21.P.20251208.0001.B0001` |
| `V21.P.20251208.0001` | 25 | `V21.P.20251208.0001.B0025` |
| `V21.P.20251208.0001` | 1500 | `V21.P.20251208.0001.B1500` |

### Database Constraint

- Stored in `TOKEN_MIGRATION_BATCH.BATCH_ID` (VARCHAR(100))
- UNIQUE constraint enforced at database level
- Referenced in `MONERIS_TOKENS_STAGING.BATCH_ID`

---

## 3. Worker ID Generation

### 3.1 Batch Worker ID

**Source:** `src/functions/batchWorker.ts` (line 42)

```typescript
const workerId = `worker-${uuidv4().substring(0, 8)}`;
```

### 3.2 Manager Worker ID

**Source:** `src/functions/batchManager.ts` (line 66)

```typescript
const workerId = `manager-${uuidv4().substring(0, 8)}`;
```

### Algorithm

1. Generate UUID v4 using `uuid` library
2. Extract first 8 characters of UUID
3. Prefix with role identifier

### Format

```
worker-{UUID_SHORT}    # For batch workers
manager-{UUID_SHORT}   # For batch managers
```

### Examples

| Role | Generated Worker ID |
|------|-------------------|
| Batch Worker | `worker-a1b2c3d4` |
| Batch Worker | `worker-f5e6d7c8` |
| Batch Manager | `manager-3e4f5a6b` |
| Batch Manager | `manager-9c8d7e6f` |

### UUID v4 Characteristics

- **Version**: UUID v4 (random)
- **Length**: 36 characters (full), 8 characters (used)
- **Character Set**: Hexadecimal (0-9, a-f)
- **Collision Probability**: ~1 in 4.3 billion for 8-char substring

### Database Storage

- Table: `TOKEN_MIGRATION_WORKERS`
- Column: `WORKER_ID` VARCHAR(50)
- Constraint: UNIQUE
- Also stored in `TOKEN_MIGRATION_BATCH.WORKER_ID`

---

## 4. Payment Method Reference (PMR) Generation

**Source:** `src/functions/batchWorker.ts` (lines 229-233)

### Algorithm

```typescript
function generatePMR(): string {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `8${timestamp}${random}`;
}
```

### Components

1. **Prefix**: Fixed digit `8`
2. **Timestamp**: Last 10 digits of Unix timestamp (milliseconds)
3. **Random**: Random 5-digit number (00000-99999)

### Format

```
8{TIMESTAMP_10}{RANDOM_5}
```

### Length

16 digits total (1 + 10 + 5)

### Examples

Assuming `Date.now() = 1735890123456`:

| Component | Value | Calculation |
|-----------|-------|-------------|
| Prefix | `8` | Fixed |
| Timestamp | `5890123456` | Last 10 digits of 1735890123456 |
| Random | `07842` | Random between 00000-99999 |
| **Result** | `8589012345607842` | Concatenation |

### Purpose

Links Moneris tokens to Payment Gateway tokens in Payment Hub system.

### Database Storage

- Table: `MONERIS_TOKENS_STAGING`
- Column: `PMR` VARCHAR(16)
- Used to correlate token migration records

### Collision Probability

- **Timestamp precision**: 10ms (last digit changes every 10ms)
- **Random space**: 100,000 possibilities
- **Combined**: ~1 million unique values per second
- Collision risk is low for batch processing workloads

---

## 5. PG Token Generation (Mock)

**Source:** `src/services/mastercard/mockService.ts` (lines 153-157)

### Algorithm

```typescript
function generateMockPgToken(): string {
  const timestamp = Date.now().toString().slice(-12);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `9${timestamp}${random}`;
}
```

### Components

1. **Prefix**: Fixed digit `9` (Mastercard token convention)
2. **Timestamp**: Last 12 digits of Unix timestamp (milliseconds)
3. **Random**: Random 3-digit number (000-999)

### Format

```
9{TIMESTAMP_12}{RANDOM_3}
```

### Length

16 digits total (1 + 12 + 3) - standard payment card length

### Examples

Assuming `Date.now() = 1735890123456`:

| Component | Value | Calculation |
|-----------|-------|-------------|
| Prefix | `9` | Fixed (Mastercard) |
| Timestamp | `735890123456` | Last 12 digits of 1735890123456 |
| Random | `427` | Random between 000-999 |
| **Result** | `9735890123456427` | Concatenation |

### Purpose

Generates mock Payment Gateway tokens for development/testing. In production, real tokens come from Mastercard API.

### Token Prefix Convention

- **9**: Mastercard tokens (both real and mock)
- **8**: PMR references (internal system)
- Other prefixes reserved for future use

### Database Storage

- Table: `PG_TOKENS_STAGING`
- Column: `PG_TOKEN` VARCHAR(50)
- UNIQUE constraint enforced

---

## 6. Database Auto-Increment IDs

**Source:** `infra/scripts/schema.sql`

### Algorithm

SQL Server IDENTITY columns with seed 1, increment 1.

### Syntax

```sql
ID BIGINT IDENTITY(1,1) PRIMARY KEY
```

### Tables Using IDENTITY

| Table | ID Column | Type | Seed | Increment |
|-------|-----------|------|------|-----------|
| `MONERIS_TOKENS_STAGING` | `ID` | BIGINT | 1 | 1 |
| `PG_TOKENS_STAGING` | `ID` | BIGINT | 1 | 1 |
| `TOKEN_MIGRATION_BATCH` | `ID` | BIGINT | 1 | 1 |
| `TOKEN_MIGRATION_AUDIT_LOG` | `ID` | BIGINT | 1 | 1 |
| `MIGRATION_ERROR_DETAILS` | `ID` | BIGINT | 1 | 1 |
| `TOKEN_MIGRATION_WORKERS` | `ID` | BIGINT | 1 | 1 |
| `MIGRATION_CONFIG` | `ID` | INT | 1 | 1 |

### Characteristics

- **Range**: BIGINT supports 9.2 quintillion values
- **Generation**: Automatic on INSERT (cannot be specified)
- **Uniqueness**: Guaranteed per table
- **Concurrency**: Thread-safe (database handles locking)
- **Gap Handling**: May have gaps due to failed transactions

### Usage

Database IDs are internal references only. Business logic uses semantic IDs (File ID, Batch ID, Worker ID).

---

## 7. Azure Queue Message IDs

**Source:** `src/services/queueService.ts` (line 83)

### Algorithm

```typescript
const response = await queueClient.sendMessage(messageText);
return response.messageId;  // Auto-generated by Azure SDK
```

### Characteristics

- **Generator**: Azure Queue Storage service
- **Format**: GUID (Globally Unique Identifier)
- **Length**: 36 characters (with hyphens)
- **Example**: `a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7a8`
- **Uniqueness**: Guaranteed globally by Azure

### Purpose

Internal tracking of queue messages. Not used in business logic or stored in database.

---

## Summary Table

| ID Type | Format | Length | Algorithm | Uniqueness Guarantee |
|---------|--------|--------|-----------|---------------------|
| **File ID** | `SOURCE.TYPE.DATE.SEQ` | ~15 chars | Parsed from filename | Filename convention |
| **Batch ID** | `FILE_ID.BNNNN` | ~20 chars | File ID + padded batch# | UNIQUE constraint |
| **Worker ID** | `worker-XXXXXXXX` | 15 chars | UUID v4 prefix | UNIQUE constraint |
| **Manager ID** | `manager-XXXXXXXX` | 16 chars | UUID v4 prefix | UNIQUE constraint |
| **PMR** | `8TTTTTTTTTTRRRRR` | 16 digits | 8 + timestamp + random | Statistical (~1M/sec) |
| **PG Token** | `9TTTTTTTTTTTTRRR` | 16 digits | 9 + timestamp + random | UNIQUE constraint |
| **DB Record ID** | Sequential integer | BIGINT | SQL IDENTITY(1,1) | Per-table unique |
| **Queue Message** | GUID | 36 chars | Azure SDK | Globally unique |

### Legend

- `X` = Hexadecimal character (0-9, a-f)
- `N` = Numeric digit (0-9)
- `T` = Timestamp digit
- `R` = Random digit

---

## Dependencies

### Required Libraries

```json
{
  "uuid": "^11.0.3"  // Worker ID generation
}
```

### Runtime Dependencies

- **Date.now()**: JavaScript native (millisecond precision)
- **Math.random()**: JavaScript native (pseudo-random)
- **Azure SDK**: Queue message ID generation
- **SQL Server**: IDENTITY auto-increment

---

## Collision Risk Analysis

### Worker ID (UUID v4, 8 chars)

- **Space**: 16^8 = 4,294,967,296 combinations
- **Birthday Paradox**: 50% collision at ~65,000 workers
- **Mitigation**: UNIQUE database constraint prevents duplicates

### PMR (Timestamp + Random)

- **Timestamp Resolution**: 10ms (last digit)
- **Random Space**: 100,000 values
- **Throughput**: ~1,000,000 unique PMRs per second
- **Collision**: Low for typical batch processing (< 100 records/sec)

### PG Token (Timestamp + Random)

- **Timestamp Resolution**: 1ms
- **Random Space**: 1,000 values
- **Throughput**: ~1,000 unique tokens per second
- **Mitigation**: UNIQUE database constraint + Mastercard validation

### File ID & Batch ID

- **Collision**: Prevented by filename convention and database constraints
- **Human Error**: Possible if same filename uploaded twice (handled by deduplication)

---

## Best Practices

1. **Always check UNIQUE constraint violations** when inserting IDs
2. **File IDs require strict filename conventions** - validate before processing
3. **Worker IDs are ephemeral** - do not rely on specific format beyond uniqueness
4. **PMRs are correlation IDs** - not suitable as primary keys
5. **Database IDs are internal** - never expose to external systems
6. **Mock PG tokens** should only be used in non-production environments

---

## Code References

| ID Type | Implementation File | Lines |
|---------|-------------------|-------|
| File ID | [src/models/migrationBatch.ts](../src/models/migrationBatch.ts) | 148-155 |
| Batch ID | [src/models/migrationBatch.ts](../src/models/migrationBatch.ts) | 160-162 |
| Worker ID | [src/functions/batchWorker.ts](../src/functions/batchWorker.ts) | 42 |
| Manager ID | [src/functions/batchManager.ts](../src/functions/batchManager.ts) | 66 |
| PMR | [src/functions/batchWorker.ts](../src/functions/batchWorker.ts) | 229-233 |
| PG Token (Mock) | [src/services/mastercard/mockService.ts](../src/services/mastercard/mockService.ts) | 153-157 |
| Database IDs | [infra/scripts/schema.sql](../infra/scripts/schema.sql) | Various |
| Queue Message ID | [src/services/queueService.ts](../src/services/queueService.ts) | 83 |
