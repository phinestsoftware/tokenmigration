# Fault Tolerance for Batch Processing Workers

## Overview

The mass migration system implements comprehensive fault tolerance mechanisms for batch processing workers to ensure reliable token migration at scale. This document explains the fault tolerance strategies, error handling, and recovery mechanisms employed throughout the batch processing pipeline.

## Architecture Components

The batch processing system consists of several interconnected Azure Functions that work together:

1. **Batch Manager** ([batchManager.ts](../src/functions/batchManager.ts)) - Divides tokens into batches and queues workers
2. **Batch Worker** ([batchWorker.ts](../src/functions/batchWorker.ts)) - Processes individual batches of tokens
3. **Queue Service** ([queueService.ts](../src/services/queueService.ts)) - Manages message queuing between components
4. **Database Service** ([database.ts](../src/services/database.ts)) - Provides fault-tolerant database operations

## Fault Tolerance Mechanisms

### 1. Queue-Based Decoupling

The system uses Azure Storage Queues to decouple components and provide natural retry capabilities:

**Benefits:**
- **Automatic Retries**: Azure Queues automatically retry failed messages
- **Poison Message Handling**: Messages that fail repeatedly are moved to poison queues
- **Visibility Timeout**: Messages become visible again if workers crash mid-processing
- **At-Least-Once Delivery**: Guarantees messages won't be lost

### 2. Worker Status Tracking

Each worker (manager or processor) creates a tracking record in the `TOKEN_MIGRATION_WORKERS` table with a unique worker ID. The table tracks:

- **Worker ID**: Unique identifier (e.g., `manager-a1b2c3d4` or `worker-e5f6g7h8`)
- **Status**: `IDLE` | `RUNNING` | `COMPLETED` | `FAILED`
- **Tokens Processed**: Count of tokens handled by this worker
- **Timestamps**: Started, completed, and last heartbeat times

**Tracking Points:**
- Batch Manager creates manager workers ([batchManager.ts:66-67](../src/functions/batchManager.ts#L66-L67))
- Batch Worker creates worker records ([batchWorker.ts:42-45](../src/functions/batchWorker.ts#L42-L45))
- Status updated on completion or failure

### 3. Comprehensive Error Handling

Both Manager and Worker implement robust error handling with try-catch blocks that update database state before re-throwing errors:

**Error Handling Pattern:**
1. Catch the error
2. Log error details with context
3. Update batch status to `FAILED`
4. Update worker status to `FAILED`
5. Insert audit log entry with error details
6. Re-throw error to trigger Azure Queue retry

**Implementation:**
- Batch Worker ([batchWorker.ts:81-94](../src/functions/batchWorker.ts#L81-L94))
- Batch Manager ([batchManager.ts:116-128](../src/functions/batchManager.ts#L116-L128))

**Benefits:**
- Failed batches are marked with `FAILED` status for tracking
- Worker status reflects failure for monitoring
- Audit trail captures error details for investigation
- Re-throwing error triggers Azure Queue retry mechanism

### 4. Bulk Operations for Atomicity

The system uses bulk database operations to ensure data consistency and performance. Instead of updating tokens one-by-one, the batch worker collects all updates during processing and applies them in bulk operations.

**How It Works:**
1. Process all tokens in the batch
2. Collect successful tokens in one array, failed tokens in another
3. Collect error details for failed tokens in a third array
4. Execute three bulk operations: success updates, failure updates, and error inserts
5. Each bulk operation processes 100 rows per chunk to avoid SQL parameter limits

**Operations:**
- `bulkUpdate()` for success/failure status updates ([database.ts:148-208](../src/services/database.ts#L148-L208))
- `bulkInsertValues()` for error details ([batchWorker.ts:209-217](../src/functions/batchWorker.ts#L209-L217))

**Benefits:**
- **Chunked Processing**: 100 rows per chunk to avoid SQL parameter limits
- **Transactional Safety**: Each chunk is atomic
- **Performance**: 100-1000x faster than individual updates
- **Error Isolation**: Failed chunks don't affect completed ones

### 5. Comprehensive Audit Logging

Every significant event is logged to `TOKEN_MIGRATION_AUDIT_LOG` with standardized message codes, human-readable descriptions, and JSON metadata.

**Audit Points:**

**Batch Worker:**
- Batch Started ([batchWorker.ts:51-52](../src/functions/batchWorker.ts#L51-L52))
- Batch Completed with success/failure counts ([batchWorker.ts:71-73](../src/functions/batchWorker.ts#L71-L73))
- Batch Failed with error details ([batchWorker.ts:89-91](../src/functions/batchWorker.ts#L89-L91))

**Batch Manager:**
- Batch Created with token count ([batchManager.ts:91-93](../src/functions/batchManager.ts#L91-L93))

**Audit Entry Structure:**
- File ID and Batch ID for tracking
- Message Code (e.g., `BATCH_START`, `BATCH_FAIL`, `BATCH_DONE`)
- Human-readable message text
- JSON metadata (counts, error details, etc.)
- Log level: `INFO` | `WARN` | `ERROR`

### 6. Status State Machine

Each batch progresses through defined states with transition tracking:

```
PENDING → PROCESSING → COMPLETED
                    ↓
                  FAILED
```

**State Transitions:**

1. **PENDING** - Batch created, waiting for worker ([batchManager.ts:162-168](../src/functions/batchManager.ts#L162-L168))
2. **PROCESSING** - Worker actively processing tokens ([batchWorker.ts:48](../src/functions/batchWorker.ts#L48))
3. **COMPLETED** - All tokens processed (success or failure) ([batchWorker.ts:65](../src/functions/batchWorker.ts#L65))
4. **FAILED** - Unrecoverable error occurred during processing ([batchWorker.ts:85](../src/functions/batchWorker.ts#L85))

**Timestamp Tracking:**

The `updateBatchStatus()` function ([batchWorker.ts:333-358](../src/functions/batchWorker.ts#L333-L358)) automatically sets timestamps:
- `PROCESS_START_TIME` when status changes to `PROCESSING`
- `PROCESS_END_TIME` when status changes to `COMPLETED` or `FAILED`
- `UPDATED_AT` on every status update
- Success and failure counts when provided

### 7. Error Classification and Isolation

Errors are categorized and stored in `MIGRATION_ERROR_DETAILS` table for analysis and potential retry. Each error record includes:

- **File ID and Batch ID**: For traceability
- **Moneris Token**: The token that failed
- **Entity ID**: Associated account/entity
- **Error Code**: Standardized code (e.g., `NO_PG_TOKEN`, `MC_FAILED`)
- **Error Message**: Detailed description
- **Error Type**: `VALIDATION` | `MIGRATION` | `SYSTEM`
- **Retry Count**: Number of retry attempts
- **Is Retryable**: Boolean flag for retry eligibility

**Error Collection:**

During batch processing ([batchWorker.ts:163-185](../src/functions/batchWorker.ts#L163-L185)), errors are collected alongside the failure updates. When a token fails (e.g., no PG token found or MC response indicates failure), the system:
1. Adds the token ID to the failure updates array
2. Captures full error details in the error details array
3. Both arrays are bulk-inserted after processing all tokens

### 8. Connection Pooling and Retry

Database connections are pooled to prevent exhaustion and handle transient failures ([database.ts:13-24](../src/services/database.ts#L13-L24)).

**Pool Configuration:**
- **Max Connections**: 10 (prevents overwhelming the database)
- **Min Connections**: 0 (scales down when idle)
- **Idle Timeout**: 30 seconds (closes idle connections)
- **Enable Arith Abort**: Ensures proper transaction handling

**Benefits:**
- Prevents connection exhaustion during high load
- Automatically reconnects on transient database failures
- Scales connection pool up/down with load
- Shared connections across multiple function invocations

### 9. Message Encoding and Decoding

Queue messages are properly encoded/decoded to prevent corruption and ensure reliable message passing between functions.

**Encoding** ([queueService.ts:74-91](../src/services/queueService.ts#L74-L91)):
- Messages are JSON stringified then base64 encoded (required by Azure Queue Storage)
- Queue is created automatically if it doesn't exist
- Returns message ID for tracking

**Decoding** ([queueService.ts:116-131](../src/services/queueService.ts#L116-L131)):
- Handles both object and string formats (Azure Functions v4 may auto-decode)
- First attempts base64 decode + JSON parse
- Falls back to direct JSON parse if base64 fails
- Type-safe with TypeScript generics

**Message Types:**
- `BatchManagerMessage`: File ID, source ID, total batches
- `BatchWorkerMessage`: Batch ID, file ID, source ID, batch number, migration type

### 10. Batch Statistics and Reconciliation

After processing completes, statistics are computed from the database to verify all tokens were accounted for ([batchWorker.ts:271-292](../src/functions/batchWorker.ts#L271-L292)).

**Statistics Calculation:**

The `getBatchStats()` function queries the `MONERIS_TOKENS_STAGING` table and groups tokens by `MIGRATION_STATUS`:
- Counts tokens with status `COMPLETED` (successful)
- Counts tokens with status `FAILED` (unsuccessful)
- Returns both counts

**Verification:**
- Total tokens = success count + failure count (ensures no lost records)
- Batch record updated with actual counts
- Discrepancies can be detected and investigated
- Provides accurate completion metrics for reporting

## Recovery Scenarios

### Scenario 1: Worker Crash Mid-Processing

**What Happens:**
1. Worker dies while processing batch
2. Queue message visibility timeout expires (default: 30 seconds)
3. Message becomes visible again in queue
4. Another worker picks up the message
5. Processing restarts from beginning

**Protection:**
- Idempotent operations (re-running won't corrupt data)
- Batch status updated atomically
- Previous failed worker marked as `FAILED` in worker table

### Scenario 2: Database Transient Failure

**What Happens:**
1. Database operation fails with transient error
2. Connection pool automatically retries connection
3. If persistent, error is caught and logged
4. Batch marked as `FAILED`
5. Message re-queued for retry

**Protection:**
- Connection pool handles reconnection
- Error logged to audit trail
- Failed batch can be manually retried

### Scenario 3: Partial Batch Processing

**What Happens:**
1. Some tokens succeed, others fail
2. Bulk update splits into success and failure updates
3. Each group updated separately
4. Error details captured for failed tokens

**Protection:**
- Chunked bulk operations (100 rows per chunk)
- Failed chunk doesn't affect other chunks
- Error details preserved for investigation

### Scenario 4: Queue Poison Messages

**What Happens:**
1. Message fails repeatedly (e.g., 5 times)
2. Azure automatically moves to poison queue
3. Processing continues with other messages
4. Poison messages reviewed manually

**Protection:**
- Dead-letter queue captures problem messages
- System continues processing good messages
- Operations team alerted to investigate

## Monitoring and Observability

### Key Metrics to Monitor

1. **Worker Health:**
   - Active workers: `SELECT COUNT(*) FROM TOKEN_MIGRATION_WORKERS WHERE STATUS = 'RUNNING'`
   - Failed workers: `SELECT COUNT(*) FROM TOKEN_MIGRATION_WORKERS WHERE STATUS = 'FAILED'`
   - Dead workers (no heartbeat): Workers with old `lastHeartbeat` timestamps

2. **Batch Progress:**
   - Pending batches: `SELECT COUNT(*) FROM TOKEN_MIGRATION_BATCH WHERE STATUS = 'PENDING'`
   - Processing batches: `SELECT COUNT(*) FROM TOKEN_MIGRATION_BATCH WHERE STATUS = 'PROCESSING'`
   - Failed batches: `SELECT COUNT(*) FROM TOKEN_MIGRATION_BATCH WHERE STATUS = 'FAILED'`

3. **Queue Depth:**
   - Check queue message count using `getQueueLength()` function

4. **Error Rates:**
   - `SELECT ERROR_CODE, COUNT(*) FROM MIGRATION_ERROR_DETAILS GROUP BY ERROR_CODE`
   - Errors by type: `SELECT ERROR_TYPE, COUNT(*) GROUP BY ERROR_TYPE`

5. **Performance Metrics:**
   - Average batch processing time
   - Tokens processed per second
   - Success rate percentage

### Logging Strategy

**Structured Logging with Context:**

The logger is created with a component name and contextual metadata (file ID, batch ID) that is automatically included in all log messages. Log messages include structured data as JSON objects for easy querying.

**Log Levels:**
- `INFO`: Normal operations, progress updates
- `WARN`: Recoverable issues, retries
- `ERROR`: Failures requiring attention

**Example Usage:**
- Logger initialized with context at function start
- Progress messages include counts and IDs
- Error messages include error objects for stack traces

## Best Practices

### 1. Always Update State Before Throwing

In error handlers, update the database state (batch status, worker status, audit logs) before re-throwing the error. This ensures the failure is recorded even if the retry fails.

### 2. Use Bulk Operations for Performance and Consistency

Collect all updates during processing and apply them in bulk operations rather than individual database calls. This improves performance by 100-1000x and ensures consistency.

### 3. Include Contextual Information in Logs

Log messages should include relevant IDs (batch ID, file ID) and metrics (counts, durations) as structured JSON objects for easy querying and debugging.

### 4. Classify and Store All Errors

Store detailed error information with standardized codes, human-readable messages, and error types. This enables root cause analysis and supports retry logic.

### 5. Use Transactions for Related Operations

Group related database operations in transactions to ensure atomicity. If one operation fails, all are rolled back to maintain consistency.

## Conclusion

The batch processing system implements multiple layers of fault tolerance:

1. **Queue-based architecture** for automatic retries and poison handling
2. **Worker tracking** for monitoring and dead worker detection
3. **Comprehensive error handling** with state updates and audit trails
4. **Bulk operations** for performance and atomicity
5. **Detailed error classification** for root cause analysis
6. **Status state machine** with timestamp tracking
7. **Connection pooling** for reliability
8. **Message encoding/decoding** for data integrity
9. **Statistics reconciliation** for data accuracy
10. **Structured logging** for observability

These mechanisms work together to ensure that token migration can proceed reliably at scale, with automatic recovery from transient failures and comprehensive tracking for investigating persistent issues.
