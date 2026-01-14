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
 * Supports two formats:
 *   - Dot format (HLD spec): SOURCE_ID.TYPE.YYYYMMDD.NNNN.input (e.g., V21.P.20251208.0001.input)
 *   - Underscore format (legacy): SOURCE_TYPE_YYYYMMDD_HHMMSS.csv (e.g., V21_P_20251208_143000.csv)
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

  // Try dot format first (HLD spec): V21.P.20251208.0001.input
  const dotMatch = baseName.match(/^([A-Z0-9]+)\.([PTI])\.(\d{8})\.(\d{4})\.(\w+)$/i);
  if (dotMatch) {
    return {
      sourceId: dotMatch[1].toUpperCase(),
      tokenType: dotMatch[2].toUpperCase(),
      date: dotMatch[3],
      sequence: dotMatch[4],
      extension: dotMatch[5].toLowerCase(),
    };
  }

  // Try underscore format (legacy): V21_P_20251208_143000.csv
  const underscoreMatch = baseName.match(/^([A-Z0-9]+)_([PTI])_(\d{8})_(\d{6})\.(\w+)$/i);
  if (underscoreMatch) {
    // Convert HHMMSS to sequence number (use first 4 digits)
    const hhmmss = underscoreMatch[4];
    const sequence = hhmmss.substring(0, 4);
    return {
      sourceId: underscoreMatch[1].toUpperCase(),
      tokenType: underscoreMatch[2].toUpperCase(),
      date: underscoreMatch[3],
      sequence: sequence,
      extension: underscoreMatch[5].toLowerCase(),
    };
  }

  return null;
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
