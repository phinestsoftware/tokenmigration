import { BatchStatusType, MigrationType, SourceId, TokenType } from '../config/index.js';

/**
 * Token migration batch record
 */
export interface MigrationBatch {
  id?: number;
  batchId: string;
  fileId: string | null;
  fileName: string | null;
  sourceId: SourceId | null;
  tokenType: TokenType | null;
  migrationType: MigrationType | null;
  context: 'MONERIS' | 'PG' | null;
  status: BatchStatusType;
  totalTokenCount: number;
  validTokenCount: number;
  successCount: number;
  failureCount: number;
  batchSize: number | null;
  batchNumber: number | null;
  totalBatches: number | null;
  fileTimestamp: Date | null;
  processStartTime: Date | null;
  processEndTime: Date | null;
  blobContainer: string | null;
  blobPath: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id?: number;
  fileId: string | null;
  batchId: string | null;
  messageCode: string | null;
  messageText: string;
  additionalInfo: Record<string, unknown> | null;
  logLevel: 'INFO' | 'WARN' | 'ERROR';
  createdAt?: Date;
}

/**
 * Migration error details
 */
export interface MigrationError {
  id?: number;
  fileId: string | null;
  batchId: string | null;
  monerisToken: string | null;
  pgToken: string | null;
  entityId: string | null;
  pmr: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  errorField: string | null;
  errorType: string | null;
  retryCount: number;
  isRetryable: boolean;
  createdAt?: Date;
}

/**
 * Worker status record
 */
export interface WorkerStatus {
  id?: number;
  workerId: string;
  batchId: string | null;
  fileId: string | null;
  mode: string | null;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  tokensProcessed: number;
  startedAt: Date | null;
  completedAt: Date | null;
  lastHeartbeat: Date | null;
  updatedAt?: Date;
}

/**
 * Migration configuration
 */
export interface MigrationConfig {
  id?: number;
  sourceId: string | null;
  configKey: string;
  configValue: string | null;
  description: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Audit log message codes
 */
export const AuditMessageCodes = {
  FILE_RECEIVED: 'FILE_RECV',
  FILE_VALIDATED: 'FILE_VALID',
  FILE_REJECTED: 'FILE_REJECT',
  FILE_LOADED: 'FILE_LOAD',
  BATCH_CREATED: 'BATCH_CREATE',
  BATCH_STARTED: 'BATCH_START',
  BATCH_COMPLETED: 'BATCH_DONE',
  BATCH_FAILED: 'BATCH_FAIL',
  TOKEN_VALIDATED: 'TOKEN_VALID',
  TOKEN_MIGRATED: 'TOKEN_MIGRATE',
  TOKEN_FAILED: 'TOKEN_FAIL',
  OUTPUT_GENERATED: 'OUTPUT_GEN',
  EMAIL_SENT: 'EMAIL_SENT',
  ERROR: 'ERROR',
} as const;

/**
 * Parse file name to extract metadata
 * Format: SOURCE_ID.TYPE.YYYYMMDD.NNNN.input
 */
export function parseFileName(fileName: string): {
  sourceId: string;
  tokenType: string;
  date: string;
  sequence: string;
  extension: string;
} | null {
  // Remove path if present
  const baseName = fileName.split('/').pop() ?? fileName;

  // Parse: V21.P.20251208.0001.input
  const match = baseName.match(/^([A-Z0-9]+)\.([PTI])\.(\d{8})\.(\d{4})\.(\w+)$/i);

  if (!match) return null;

  return {
    sourceId: match[1].toUpperCase(),
    tokenType: match[2].toUpperCase(),
    date: match[3],
    sequence: match[4],
    extension: match[5].toLowerCase(),
  };
}

/**
 * Generate file ID from file name
 */
export function generateFileId(fileName: string): string {
  const parsed = parseFileName(fileName);
  if (parsed) {
    return `${parsed.sourceId}.${parsed.tokenType}.${parsed.date}.${parsed.sequence}`;
  }
  // Fallback: use timestamp
  return `FILE_${Date.now()}`;
}

/**
 * Generate batch ID
 */
export function generateBatchId(fileId: string, batchNumber: number): string {
  return `${fileId}.B${String(batchNumber).padStart(4, '0')}`;
}

/**
 * Generate output file name
 */
export function generateOutputFileName(
  sourceId: string,
  tokenType: string,
  date: string,
  sequence: string,
  suffix: 'output' | 'failure'
): string {
  return `${sourceId}.${tokenType}.${date}.${sequence}.${suffix}`;
}

/**
 * Migration summary for reporting
 */
export interface MigrationSummary {
  fileId: string;
  fileName: string | null;
  sourceId: string | null;
  tokenType: string | null;
  status: BatchStatusType;
  totalTokenCount: number;
  validTokenCount: number;
  migratedCount: number;
  failedCount: number;
  pendingCount: number;
  processStartTime: Date | null;
  processEndTime: Date | null;
  durationSeconds: number | null;
}

/**
 * Batch status for monitoring
 */
export interface BatchStatusSummary {
  batchId: string;
  fileId: string | null;
  sourceId: string | null;
  status: BatchStatusType;
  batchNumber: number | null;
  totalBatches: number | null;
  batchSize: number | null;
  successCount: number;
  failureCount: number;
  processStartTime: Date | null;
  processEndTime: Date | null;
  durationSeconds: number | null;
}
