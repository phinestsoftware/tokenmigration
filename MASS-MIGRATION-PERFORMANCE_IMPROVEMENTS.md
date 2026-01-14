# Performance Improvements for Mass Migration

This document outlines performance optimization recommendations for the mass-migration system, prioritized by impact and implementation effort.

---

## High-Impact Improvements (2-5x faster)

### 1. Increase Database Connection Pool

**File:** `src/services/database.ts`

**Current Configuration:**
```typescript
pool: {
  max: 10,
  min: 0,
  idleTimeoutMillis: 30000,
}
```

**Problem:** With 10+ parallel batch workers competing for connections, database access becomes serialized.

**Recommended Change:**
```typescript
pool: {
  max: 50,  // Increase to 50-100 for high parallelism
  min: 5,   // Keep minimum connections warm
  idleTimeoutMillis: 30000,
}
```

**Impact:** 2-3x improvement for parallel batch processing

---

### 2. Increase Bulk Operation Chunk Size

**File:** `src/services/database.ts`

**Current:** 100 rows per bulk INSERT/UPDATE

**Problem:** Processing 10,000 tokens requires 100 separate database round-trips.

**Recommended Change:** Increase chunk size to 500-1000 rows (staying under SQL Server's 2100 parameter limit).

```typescript
// Current
const CHUNK_SIZE = 100;

// Recommended
const CHUNK_SIZE = 500;
```

**Impact:** 2x improvement in bulk operation throughput

---

### 3. Use Streaming CSV Parser

**Files:** `src/services/fileParser.ts`, `src/functions/uploadFile.ts`

**Current:** Synchronous `csv-parse` loads entire file into memory before processing.

**Problem:** Blocks during large file parsing, high memory usage for files >100MB.

**Recommended Change:** Switch to streaming parser:
```typescript
import { parse } from 'csv-parse';
import { createReadStream } from 'stream';

// Stream-based parsing
const parser = createReadStream(filePath).pipe(parse({ columns: true }));
for await (const record of parser) {
  // Process each record as it's parsed
}
```

**Impact:** 2x improvement for large files, reduced memory footprint

---

### 4. Optimize Batch Worker Query

**File:** `src/functions/batchWorker.ts`

**Current:** Two-step process with in-memory Map lookup:
```typescript
// Step 1: Get Moneris tokens
const monerisTokens = await getMonerisTokensByBatchId(batchId);

// Step 2: Get PG tokens (correlated subquery)
const pgTokens = await getPgTokensByMonerisTokens(fileId, monerisTokens);

// Step 3: In-memory map creation
const pgTokenMap = new Map(pgTokens.map(t => [t.monerisToken, t]));
```

**Problem:** O(n*m) complexity for token matching, extra round-trip.

**Recommended Change:** Use direct SQL JOIN:
```sql
SELECT
  m.ID, m.MONERIS_TOKEN, m.EXPIRY_DATE, m.ENTITY_ID, m.ENTITY_TYPE,
  p.PG_TOKEN, p.CARD_BRAND, p.FUNDING_METHOD, p.STATUS as PG_STATUS
FROM MONERIS_TOKENS_STAGING m
LEFT JOIN PG_TOKENS_STAGING p
  ON m.MONERIS_TOKEN = p.MONERIS_TOKEN
  AND m.FILE_ID = p.FILE_ID
WHERE m.BATCH_ID = @batchId
```

**Impact:** 1.5-2x improvement per batch worker

---

## Medium-Impact Improvements (1.5-2x faster)

### 5. Combine Database Operations into Transactions

**File:** `src/functions/batchWorker.ts`

**Current:** 5 separate round-trips per batch worker:
1. Query Moneris tokens
2. Query PG tokens
3. Bulk update success tokens
4. Bulk update failure tokens
5. Bulk insert error details

**Recommended Change:** Wrap related operations in a single transaction:
```typescript
const transaction = new sql.Transaction(pool);
await transaction.begin();
try {
  await bulkUpdateSuccess(transaction, successTokens);
  await bulkUpdateFailure(transaction, failureTokens);
  await bulkInsertErrors(transaction, errorDetails);
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

**Impact:** 1.3-1.5x improvement per batch

---

### 6. Add Composite Database Indexes

**File:** `database/migrations/` (new migration)

**Current indexes:** Single-column indexes on FILE_ID, BATCH_ID, MONERIS_TOKEN

**Recommended Additional Indexes:**
```sql
-- For batch worker queries
CREATE INDEX IX_MONERIS_STAGING_FILE_BATCH
ON MONERIS_TOKENS_STAGING (FILE_ID, BATCH_ID)
INCLUDE (MONERIS_TOKEN, VALIDATION_STATUS);

-- For status filtering
CREATE INDEX IX_MONERIS_STAGING_BATCH_STATUS
ON MONERIS_TOKENS_STAGING (BATCH_ID, VALIDATION_STATUS);

-- For billing file generation
CREATE INDEX IX_MONERIS_STAGING_FILE_MIGRATION
ON MONERIS_TOKENS_STAGING (FILE_ID, MIGRATION_STATUS)
INCLUDE (MONERIS_TOKEN, ENTITY_ID, PMR);
```

**Impact:** 1.3x improvement for query-heavy operations

---

### 7. Parallel Blob Operations

**File:** `src/functions/generateBillingFile.ts`

**Current:** Sequential blob uploads:
```typescript
await uploadBlob(successFile);
await uploadBlob(failureFile);
```

**Recommended Change:**
```typescript
await Promise.all([
  uploadBlob(successFile),
  uploadBlob(failureFile)
]);
```

**Impact:** 1.2-1.5x improvement for file generation

---

### 8. Increase Default Batch Size

**Table:** `MIGRATION_CONFIG`

**Current:** 1000 tokens per batch

**Recommended:** Increase to 2000-5000 for large files to reduce batch overhead.

```sql
UPDATE MIGRATION_CONFIG
SET CONFIG_VALUE = '3000'
WHERE CONFIG_KEY = 'DEFAULT_BATCH_SIZE';
```

**Impact:** 1.2x improvement (fewer batches = less overhead)

---

## Quick Wins (Easy to implement)

### 9. Reduce Queue Polling Interval

**File:** `host.json`

**Current:**
```json
"queues": {
  "maxPollingInterval": "00:00:02"
}
```

**Recommended:**
```json
"queues": {
  "maxPollingInterval": "00:00:01"
}
```

**Impact:** 1.1x improvement in queue responsiveness

---

### 10. Increase Function Timeout

**File:** `host.json`

**Current:** 10 minutes

**Recommended:**
```json
{
  "functionTimeout": "00:20:00"
}
```

**Impact:** Prevents timeouts for larger batches

---

### 11. Increase MAX_ACTIVE_WORKERS

**File:** `src/config/index.ts`

**Current:**
```typescript
MAX_ACTIVE_WORKERS: '10'
```

**Recommended:** After increasing connection pool:
```typescript
MAX_ACTIVE_WORKERS: '30'
```

**Impact:** 1.5-2x improvement with sufficient DB connections

---

### 12. Cache Configuration Lookups

**File:** `src/functions/createBatch.ts`

**Current:** Queries `MIGRATION_CONFIG` table for each batch creation.

**Recommended:** Cache batch size settings:
```typescript
const configCache = new Map<string, string>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedConfig(key: string): Promise<string> {
  if (configCache.has(key)) {
    return configCache.get(key)!;
  }
  const value = await getConfigFromDb(key);
  configCache.set(key, value);
  setTimeout(() => configCache.delete(key), CACHE_TTL);
  return value;
}
```

**Impact:** Reduces DB queries by ~1 per file

---

## Architecture-Level Improvements (Longer term)

### 13. Use SQL Bulk Copy (BCP) Instead of VALUES Clause

**File:** `src/services/database.ts`

**Current:** INSERT/UPDATE via parameterized VALUES with JOIN pattern.

**Recommended:** Use `mssql` library's bulk insert:
```typescript
const table = new sql.Table('MONERIS_TOKENS_STAGING');
table.columns.add('MONERIS_TOKEN', sql.VarChar(16));
table.columns.add('EXPIRY_DATE', sql.VarChar(4));
// ... add all columns

tokens.forEach(token => {
  table.rows.add(token.monerisToken, token.expiryDate, ...);
});

await pool.request().bulk(table);
```

**Impact:** 10-100x faster for large inserts

---

### 14. Partition Staging Tables

For 10M+ tokens, partition tables by `FILE_ID`:

```sql
CREATE PARTITION FUNCTION pf_FileId (BIGINT)
AS RANGE RIGHT FOR VALUES (1000, 2000, 3000, ...);

CREATE PARTITION SCHEME ps_FileId
AS PARTITION pf_FileId ALL TO ([PRIMARY]);

-- Apply to staging tables
CREATE CLUSTERED INDEX IX_MONERIS_STAGING_PARTITIONED
ON MONERIS_TOKENS_STAGING (FILE_ID, ID)
ON ps_FileId (FILE_ID);
```

**Impact:** Enables parallel partition processing, faster cleanup

---

### 15. Consider Azure SQL Hyperscale

For massive volumes (100M+ tokens):
- Near-instant database scaling
- Read replicas for parallel queries
- 100TB storage capacity

---

## Implementation Priority

| Priority | Change | Effort | Impact | Dependencies |
|----------|--------|--------|--------|--------------|
| 1 | Increase connection pool | Low | 2-3x | None |
| 2 | Increase bulk chunk size | Low | 2x | None |
| 3 | Increase MAX_ACTIVE_WORKERS | Low | 1.5x | #1 |
| 4 | Reduce queue polling | Trivial | 1.1x | None |
| 5 | Increase function timeout | Trivial | Stability | None |
| 6 | Optimize batch worker query | Medium | 1.5x | None |
| 7 | Add composite indexes | Low | 1.3x | None |
| 8 | Streaming CSV parser | Medium | 2x (large files) | None |
| 9 | Parallel blob operations | Low | 1.2x | None |
| 10 | Transaction batching | Medium | 1.3x | None |
| 11 | SQL Bulk Copy | High | 10x+ | Testing |
| 12 | Table partitioning | High | 2x+ | DBA review |

---

## Estimated Combined Impact

Implementing items 1-7 (Low-Medium effort) could yield:
- **Conservative estimate:** 3-4x overall improvement
- **Optimistic estimate:** 5-6x overall improvement

For a 1M token file:
- **Current:** ~45-60 minutes (excluding MC response time)
- **After optimization:** ~10-15 minutes

---

## Monitoring Recommendations

After implementing changes, monitor:
1. Database connection pool utilization
2. Average batch processing time
3. Queue message processing latency
4. Function execution duration
5. Memory consumption per function instance

Use Azure Application Insights queries:
```kusto
requests
| where name contains "batchWorker"
| summarize avg(duration), percentile(duration, 95), count() by bin(timestamp, 5m)
```
