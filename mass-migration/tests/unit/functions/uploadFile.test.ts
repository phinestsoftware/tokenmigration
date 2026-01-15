/**
 * Unit tests for uploadFile function
 * Tests batch record creation when files are rejected
 */

import { InvocationContext } from '@azure/functions';

// Mock the database service BEFORE importing uploadFile
jest.mock('../../../src/services/database', () => ({
  executeQuery: jest.fn().mockResolvedValue({ recordset: [], rowsAffected: [0] }),
  bulkInsertValues: jest.fn().mockResolvedValue(0),
}));

// Mock the queue service
jest.mock('../../../src/services/queueService', () => ({
  queueValidateTokens: jest.fn().mockResolvedValue(undefined),
  queueBatchManager: jest.fn().mockResolvedValue(undefined),
}));

// Mock the email service
jest.mock('../../../src/services/emailService', () => ({
  sendMigrationStartEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock the blob storage service
jest.mock('../../../src/services/blobStorage', () => ({
  downloadBlob: jest.fn().mockResolvedValue(Buffer.from('')),
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    withFileId: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  })),
}));

import { executeQuery } from '../../../src/services/database';
import { uploadFileHandler } from '../../../src/functions/uploadFile';
import { AuditMessageCodes } from '../../../src/models/migrationBatch';

describe('uploadFile - Batch record creation for rejected files', () => {
  // Track all database calls to analyze what was inserted
  let dbCalls: Array<{ query: string; params: Record<string, unknown> }> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    dbCalls = [];

    // Capture all database calls
    (executeQuery as jest.Mock).mockImplementation((query: string, params: Record<string, unknown>) => {
      dbCalls.push({ query, params });
      return Promise.resolve({ recordset: [], rowsAffected: [1] });
    });
  });

  /**
   * Helper to create a mock InvocationContext
   */
  function createMockContext(fileName: string): InvocationContext {
    return {
      functionName: 'uploadFileBilling',
      triggerMetadata: {
        name: `billing-input/V21/${fileName}`,
        uri: `https://storage.blob.core.windows.net/billing-input/V21/${fileName}`,
      },
      invocationId: 'test-invocation-id',
      log: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as InvocationContext;
  }

  /**
   * Helper to check if a specific INSERT was made
   */
  function wasTableInserted(tableName: string): boolean {
    return dbCalls.some(call =>
      call.query.includes(`INSERT INTO ${tableName}`)
    );
  }

  /**
   * Helper to get audit log inserts
   */
  function getAuditLogInserts(): Array<{ query: string; params: Record<string, unknown> }> {
    return dbCalls.filter(call =>
      call.query.includes('INSERT INTO TOKEN_MIGRATION_AUDIT_LOG')
    );
  }

  /**
   * Helper to get batch inserts
   */
  function getBatchInserts(): Array<{ query: string; params: Record<string, unknown> }> {
    return dbCalls.filter(call =>
      call.query.includes('INSERT INTO TOKEN_MIGRATION_BATCH')
    );
  }

  describe('When file structure validation FAILS', () => {
    it('should create audit log entry with FILE_REJECTED', async () => {
      // Invalid CSV - missing required columns (no header row)
      const invalidCsvContent = 'just,some,random,data\n1,2,3,4';
      const blob = Buffer.from(invalidCsvContent);
      const context = createMockContext('V21.P.20260113.0001.input');

      // Execute - should throw due to validation failure
      await expect(uploadFileHandler(blob, context)).rejects.toThrow('File validation failed');

      // Verify: Audit log WAS inserted with FILE_REJECTED
      const auditInserts = getAuditLogInserts();
      expect(auditInserts.length).toBeGreaterThan(0);

      const fileRejectedInsert = auditInserts.find(
        call => call.params.messageCode === AuditMessageCodes.FILE_REJECTED
      );
      expect(fileRejectedInsert).toBeDefined();
      expect(fileRejectedInsert?.params.fileId).toBeDefined();
    });

    it('should create batch record even when file is rejected', async () => {
      // Invalid CSV - wrong column structure
      const invalidCsvContent = 'WRONG_COL1,WRONG_COL2\ndata1,data2';
      const blob = Buffer.from(invalidCsvContent);
      const context = createMockContext('V21.P.20260113.0002.input');

      // Execute - should throw due to validation failure
      await expect(uploadFileHandler(blob, context)).rejects.toThrow('File validation failed');

      // Get the file ID that was used for the audit log
      const auditInserts = getAuditLogInserts();
      const fileRejectedInsert = auditInserts.find(
        call => call.params.messageCode === AuditMessageCodes.FILE_REJECTED
      );
      const fileId = fileRejectedInsert?.params.fileId;

      // Check if batch record was created
      const batchInserts = getBatchInserts();

      // Batch record should be created even for rejected files
      expect(batchInserts.length).toBeGreaterThan(0);

      // Verify the batch has the file ID and was created with VALIDATING status
      const batchInsert = batchInserts.find(call => call.params.fileId === fileId);
      expect(batchInsert).toBeDefined();
      expect(batchInsert?.params.status).toBe('VALIDATING');

      // Verify that batch status was updated to REJECTED
      const batchUpdates = dbCalls.filter(call =>
        call.query.includes('UPDATE TOKEN_MIGRATION_BATCH') &&
        call.params.status === 'REJECTED'
      );
      expect(batchUpdates.length).toBeGreaterThan(0);
    });

    it('should have matching FILE_ID in both audit log and batch table', async () => {
      const invalidCsvContent = 'BAD,CSV,STRUCTURE\n1,2,3';
      const blob = Buffer.from(invalidCsvContent);
      const context = createMockContext('V21.P.20260113.0003.input');

      await expect(uploadFileHandler(blob, context)).rejects.toThrow('File validation failed');

      // Get file IDs from both tables
      const auditInserts = getAuditLogInserts();
      const batchInserts = getBatchInserts();

      // There should be audit log entries
      expect(auditInserts.length).toBeGreaterThan(0);

      const auditFileIds = auditInserts.map(call => call.params.fileId);
      const batchFileIds = batchInserts.map(call => call.params.fileId);

      // Every FILE_ID in audit log should also exist in batch table
      auditFileIds.forEach(auditFileId => {
        expect(batchFileIds).toContain(auditFileId);
      });
    });
  });

  describe('When file structure validation PASSES', () => {
    it('should create both audit log and batch record', async () => {
      // Valid CSV with all required columns
      const validCsvContent = [
        'MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT,USAGE_TYPE',
        '9518050018246830,0139,E10001,1,O,20240115,20241201,,,',
      ].join('\n');
      const blob = Buffer.from(validCsvContent);
      const context = createMockContext('V21.P.20260113.0004.input');

      // Execute - should succeed
      await uploadFileHandler(blob, context);

      // Verify: Both audit log and batch record were created
      expect(wasTableInserted('TOKEN_MIGRATION_AUDIT_LOG')).toBe(true);
      expect(wasTableInserted('TOKEN_MIGRATION_BATCH')).toBe(true);

      // Verify: Audit log has FILE_RECEIVED (not FILE_REJECTED)
      const auditInserts = getAuditLogInserts();
      const fileReceivedInsert = auditInserts.find(
        call => call.params.messageCode === AuditMessageCodes.FILE_RECEIVED
      );
      expect(fileReceivedInsert).toBeDefined();
    });

    it('should have matching FILE_ID in both tables for valid files', async () => {
      const validCsvContent = [
        'MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT,USAGE_TYPE',
        '9518050018246831,0625,E10002,1,O,20240220,20241115,,,',
      ].join('\n');
      const blob = Buffer.from(validCsvContent);
      const context = createMockContext('V21.P.20260113.0005.input');

      await uploadFileHandler(blob, context);

      const auditInserts = getAuditLogInserts();
      const batchInserts = getBatchInserts();

      // Both should have entries
      expect(auditInserts.length).toBeGreaterThan(0);
      expect(batchInserts.length).toBeGreaterThan(0);

      // FILE_IDs should match
      const auditFileId = auditInserts[0]?.params.fileId;
      const batchFileId = batchInserts[0]?.params.fileId;
      expect(auditFileId).toBe(batchFileId);
    });
  });
});

/**
 * Bug #43: TOKEN_MIGRATION_BATCH should be created for Mastercard response files
 * Per DDD: "Assign File id to the uploaded tokens and insert record to: TOKEN_MIGRATION_BATCH"
 * This applies to BOTH Moneris files AND Mastercard response files
 */
describe('uploadFile - Bug #43: MC response should create its own batch record', () => {
  let dbCalls: Array<{ query: string; params: Record<string, unknown> }> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    dbCalls = [];

    // Capture all database calls
    (executeQuery as jest.Mock).mockImplementation((query: string, params: Record<string, unknown>) => {
      dbCalls.push({ query, params });
      // Return empty result for SELECT queries
      return Promise.resolve({ recordset: [], rowsAffected: [1] });
    });
  });

  /**
   * Helper to create a mock InvocationContext for MC response files
   */
  function createMcResponseContext(fileName: string): InvocationContext {
    return {
      functionName: 'uploadFileMastercard',
      triggerMetadata: {
        name: `mastercard-mapping/${fileName}`,
        uri: `https://storage.blob.core.windows.net/mastercard-mapping/${fileName}`,
      },
      invocationId: 'test-invocation-id',
      log: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as InvocationContext;
  }

  /**
   * Helper to get batch inserts
   */
  function getBatchInserts(): Array<{ query: string; params: Record<string, unknown> }> {
    return dbCalls.filter(call =>
      call.query.includes('INSERT INTO TOKEN_MIGRATION_BATCH')
    );
  }

  /**
   * Sample MC response CSV content
   */
  function createMcResponseCsv(): string {
    return [
      'apiOperation,correlationId,sourceOfFunds.type,sourceOfFunds.provided.card.number,sourceOfFunds.provided.card.expiry.month,sourceOfFunds.provided.card.expiry.year,result,error.cause,error.explanation,error.field,error.supportCode,error.validationType,token,schemeToken.status,sourceOfFunds.provided.card.fundingMethod,sourceOfFunds.provided.card.expiry,sourceOfFunds.provided.card.scheme',
      ',9518050018246830,CARD,411111******1111,,,SUCCESS,,,,,9876543210123456,ACTIVE,CREDIT,1226,VISA',
      ',9518050018246831,CARD,555555******4444,,,SUCCESS,,,,,9876543210123457,ACTIVE,CREDIT,0627,MASTERCARD',
    ].join('\n');
  }

  describe('When processing MC response file with standard naming', () => {
    it('should create a TOKEN_MIGRATION_BATCH record for the MC response file', async () => {
      const mcResponseCsv = createMcResponseCsv();
      const blob = Buffer.from(mcResponseCsv);
      // Standard naming: SOURCE.TYPE.DATE.SEQ.mc.response
      const context = createMcResponseContext('V21.P.20260114.0001.mc.response');

      await uploadFileHandler(blob, context);

      // Bug #43: MC response file should create its own batch record
      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);

      // Verify the batch record has correct attributes
      const batchInsert = batchInserts[0];
      expect(batchInsert).toBeDefined();
      // CONTEXT is hardcoded as 'MassMigPG' in the SQL, not passed as a parameter
      expect(batchInsert.query).toContain('MassMigPG');
      expect(batchInsert.params.fileName).toContain('mc.response');
    });

    it('should have SOURCE_ID parsed from MC response filename', async () => {
      const mcResponseCsv = createMcResponseCsv();
      const blob = Buffer.from(mcResponseCsv);
      const context = createMcResponseContext('V21.P.20260114.0002.mc.response');

      await uploadFileHandler(blob, context);

      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);

      // Bug #43: SOURCE_ID should be parsed from filename, not null
      const batchInsert = batchInserts[0];
      expect(batchInsert.params.sourceId).toBe('V21');
    });

    it('should have TOKEN_TYPE parsed from MC response filename', async () => {
      const mcResponseCsv = createMcResponseCsv();
      const blob = Buffer.from(mcResponseCsv);
      const context = createMcResponseContext('WINM.P.20260114.0003.mc.response');

      await uploadFileHandler(blob, context);

      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);

      // Bug #43: TOKEN_TYPE should be parsed from filename, not null
      const batchInsert = batchInserts[0];
      expect(batchInsert.params.tokenType).toBe('P');
    });

    it('should have FILE_NAME set to the actual MC response filename', async () => {
      const mcResponseCsv = createMcResponseCsv();
      const blob = Buffer.from(mcResponseCsv);
      const mcFileName = 'TSC.P.20260114.0004.mc.response';
      const context = createMcResponseContext(mcFileName);

      await uploadFileHandler(blob, context);

      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);

      // Bug #43: FILE_NAME should be the MC response filename
      const batchInsert = batchInserts[0];
      expect(batchInsert.params.fileName).toBe(mcFileName);
    });
  });

  describe('When processing MC response file with FILE_ format (legacy)', () => {
    it('should create a TOKEN_MIGRATION_BATCH record even for FILE_ format', async () => {
      const mcResponseCsv = createMcResponseCsv();
      const blob = Buffer.from(mcResponseCsv);
      const context = createMcResponseContext('FILE_1705123456789.mc.response');

      await uploadFileHandler(blob, context);

      // Bug #43: Even legacy FILE_ format should create a batch record
      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);

      const batchInsert = batchInserts[0];
      // CONTEXT is hardcoded as 'MassMigPG' in the SQL, not passed as a parameter
      expect(batchInsert.query).toContain('MassMigPG');
    });
  });
});
