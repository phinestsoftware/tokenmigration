/**
 * Unit tests for uploadFile function (Queue trigger for Event Grid)
 * Tests batch record creation and file processing
 *
 * NOTE: With the new BULK INSERT approach:
 * - Billing files use bulkInsertMonerisTokens (SQL BULK INSERT from blob)
 * - getBlobHeaderLine is used for quick header validation
 * - MC response files use bulkInsertMcResponse (unchanged)
 */

import { InvocationContext } from '@azure/functions';

// Mock the database service BEFORE importing uploadFile
jest.mock('../../../src/services/database', () => ({
  executeQuery: jest.fn().mockResolvedValue({ recordset: [], rowsAffected: [0] }),
  bulkInsertValues: jest.fn().mockResolvedValue(0),
  bulkInsertMcResponse: jest.fn().mockResolvedValue({ rowsInserted: 100, rowsUpdated: 100 }),
  bulkInsertMonerisTokens: jest.fn().mockResolvedValue({ rowsInserted: 1 }),
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
  getBlobHeaderLine: jest.fn().mockResolvedValue('MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT,USAGE_TYPE'),
  getBlobProperties: jest.fn().mockResolvedValue({ contentLength: 100 }),
}));

// Mock the config
jest.mock('../../../src/config/index', () => ({
  getConfig: jest.fn(() => ({
    STORAGE_ACCOUNT_NAME: 'teststorage',
    STORAGE_CONNECTION_STRING: 'test-connection-string',
  })),
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

import { executeQuery, bulkInsertMcResponse, bulkInsertMonerisTokens } from '../../../src/services/database';
import { getBlobHeaderLine } from '../../../src/services/blobStorage';
import { uploadFileQueueHandler } from '../../../src/functions/uploadFile';
import { AuditMessageCodes } from '../../../src/models/migrationBatch';

describe('uploadFile (Queue trigger for Event Grid)', () => {
  let dbCalls: Array<{ query: string; params: Record<string, unknown> }> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    dbCalls = [];

    // Default mock for header validation - valid header
    (getBlobHeaderLine as jest.Mock).mockResolvedValue(
      'MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT,USAGE_TYPE'
    );

    // Default mock for bulk insert - success
    (bulkInsertMonerisTokens as jest.Mock).mockResolvedValue({ rowsInserted: 1 });

    // Capture all database calls
    (executeQuery as jest.Mock).mockImplementation((query: string, params: Record<string, unknown>) => {
      dbCalls.push({ query, params });
      return Promise.resolve({ recordset: [], rowsAffected: [1] });
    });
  });

  /**
   * Helper to create Event Grid queue message for blob created event
   */
  function createBlobCreatedQueueMessage(containerName: string, blobName: string, contentLength: number = 100): unknown {
    // Event Grid message format when delivered via Storage Queue
    return {
      id: 'test-event-id',
      eventType: 'Microsoft.Storage.BlobCreated',
      subject: `/blobServices/default/containers/${containerName}/blobs/${blobName}`,
      data: {
        url: `https://storage.blob.core.windows.net/${containerName}/${blobName}`,
        contentLength,
      },
      dataVersion: '',
      metadataVersion: '1',
    };
  }

  /**
   * Helper to create mock InvocationContext
   */
  function createMockContext(): InvocationContext {
    return {
      functionName: 'uploadFile',
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

  describe('Billing file processing with BULK INSERT', () => {
    it('should create audit log and batch record for valid billing file', async () => {
      const queueMessage = createBlobCreatedQueueMessage('billing-input', 'V21/V21.P.20260113.0001.input');
      const context = createMockContext();

      await uploadFileQueueHandler(queueMessage, context);

      // Verify header validation was called
      expect(getBlobHeaderLine).toHaveBeenCalledWith('billing-input', 'V21/V21.P.20260113.0001.input');

      // Verify bulk insert was called
      expect(bulkInsertMonerisTokens).toHaveBeenCalledWith(
        'billing-input',
        'V21/V21.P.20260113.0001.input',
        expect.any(String)
      );

      // Verify audit log was created
      const auditInserts = getAuditLogInserts();
      expect(auditInserts.length).toBeGreaterThan(0);

      // Verify batch record was created
      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);
    });

    it('should reject file with invalid headers', async () => {
      // Mock invalid header
      (getBlobHeaderLine as jest.Mock).mockResolvedValue('WRONG_COL1,WRONG_COL2');

      const queueMessage = createBlobCreatedQueueMessage('billing-input', 'V21/V21.P.20260113.0002.input');
      const context = createMockContext();

      // Should throw for queue trigger (triggers retry)
      await expect(uploadFileQueueHandler(queueMessage, context)).rejects.toThrow(/Missing required columns/);

      // Should still create audit log with FILE_REJECTED
      const auditInserts = getAuditLogInserts();
      const fileRejectedInsert = auditInserts.find(
        call => call.params.messageCode === AuditMessageCodes.FILE_REJECTED
      );
      expect(fileRejectedInsert).toBeDefined();
    });

    it('should use bulkInsertMonerisTokens for billing files', async () => {
      const queueMessage = createBlobCreatedQueueMessage('billing-input', 'V21/V21.P.20260113.0003.input', 10000000);
      const context = createMockContext();

      await uploadFileQueueHandler(queueMessage, context);

      // Verify bulkInsertMonerisTokens was called (not streaming)
      expect(bulkInsertMonerisTokens).toHaveBeenCalledWith(
        'billing-input',
        'V21/V21.P.20260113.0003.input',
        'V21.P.20260113.0003'
      );
    });
  });

  describe('Mastercard response file processing', () => {
    it('should call bulkInsertMcResponse for MC response file', async () => {
      const queueMessage = createBlobCreatedQueueMessage('mastercard-mapping', 'V21.P.20260114.0001.mc.response');
      const context = createMockContext();

      await uploadFileQueueHandler(queueMessage, context);

      // Verify bulkInsertMcResponse was called
      expect(bulkInsertMcResponse).toHaveBeenCalledWith(
        'mastercard-mapping',
        'V21.P.20260114.0001.mc.response',
        expect.any(String)
      );
    });

    it('should parse FILE_ID from MC response filename', async () => {
      const queueMessage = createBlobCreatedQueueMessage('mastercard-mapping', 'V21.P.20260114.0002.mc.response');
      const context = createMockContext();

      await uploadFileQueueHandler(queueMessage, context);

      // Verify bulkInsertMcResponse was called with correct fileId
      expect(bulkInsertMcResponse).toHaveBeenCalledWith(
        'mastercard-mapping',
        'V21.P.20260114.0002.mc.response',
        'V21.P.20260114.0002'
      );
    });
  });

  describe('Unknown container handling', () => {
    it('should ignore blobs from unknown containers', async () => {
      const queueMessage = createBlobCreatedQueueMessage('unknown-container', 'test.csv');
      const context = createMockContext();

      // Should complete without error but not process
      await uploadFileQueueHandler(queueMessage, context);

      // Should not create any database records
      expect(dbCalls.length).toBe(0);

      // Should not call bulk insert
      expect(bulkInsertMonerisTokens).not.toHaveBeenCalled();
      expect(bulkInsertMcResponse).not.toHaveBeenCalled();
    });
  });

  describe('Queue message parsing', () => {
    it('should handle base64 encoded queue messages', async () => {
      // Event Grid message as base64 string (how Azure Queue sometimes delivers)
      const event = {
        id: 'test-event-id',
        eventType: 'Microsoft.Storage.BlobCreated',
        subject: '/blobServices/default/containers/billing-input/blobs/V21/test.csv',
        data: {
          url: 'https://storage.blob.core.windows.net/billing-input/V21/test.csv',
          contentLength: 100,
        },
      };
      const base64Message = Buffer.from(JSON.stringify(event)).toString('base64');

      const context = createMockContext();

      await uploadFileQueueHandler(base64Message, context);

      // Verify bulk insert was called
      expect(bulkInsertMonerisTokens).toHaveBeenCalled();

      // Verify batch record was created
      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);
    });

    it('should handle array-wrapped Event Grid messages', async () => {
      // Event Grid sometimes sends as array
      const events = [{
        id: 'test-event-id',
        eventType: 'Microsoft.Storage.BlobCreated',
        subject: '/blobServices/default/containers/billing-input/blobs/V21/test.csv',
        data: {
          url: 'https://storage.blob.core.windows.net/billing-input/V21/test.csv',
          contentLength: 100,
        },
      }];

      const context = createMockContext();

      await uploadFileQueueHandler(events, context);

      // Verify bulk insert was called
      expect(bulkInsertMonerisTokens).toHaveBeenCalled();

      // Verify batch record was created
      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);
    });
  });
});
