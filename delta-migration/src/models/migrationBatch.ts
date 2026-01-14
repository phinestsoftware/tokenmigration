export interface MigrationBatch {
  id?: number;
  batchId: string;
  fileId: string;
  sourceId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalTokens: number;
  processedTokens: number;
  successCount: number;
  errorCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  sourceId: string;
  fileType: string;
  status: 'UPLOADED' | 'VALIDATING' | 'VALIDATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  uploadedAt: Date;
  processedAt?: Date;
}
