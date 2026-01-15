/**
 * Unit tests for uploadFile function (Event Grid HTTP trigger)
 * Tests batch record creation and file processing
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import { Readable } from 'stream';

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
  getBlobStream: jest.fn().mockImplementation(() => {
    return Promise.resolve(Readable.from(Buffer.from('')));
  }),
  getBlobProperties: jest.fn().mockResolvedValue({ contentLength: 100 }),
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
import { getBlobStream } from '../../../src/services/blobStorage';
import { uploadFileHttpHandler } from '../../../src/functions/uploadFile';
import { AuditMessageCodes } from '../../../src/models/migrationBatch';

describe('uploadFile (Event Grid HTTP trigger)', () => {
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
   * Helper to create a mock HttpRequest for Event Grid validation
   */
  function createValidationRequest(): HttpRequest {
    const validationEvent = [{
      id: 'test-id',
      eventType: 'Microsoft.EventGrid.SubscriptionValidationEvent',
      data: {
        validationCode: 'test-validation-code',
      },
    }];

    return {
      method: 'POST',
      url: 'https://func.azurewebsites.net/api/upload/event-grid',
      headers: new Map([['aeg-event-type', 'SubscriptionValidation']]),
      json: jest.fn().mockResolvedValue(validationEvent),
    } as unknown as HttpRequest;
  }

  /**
   * Helper to create a mock HttpRequest for blob created event
   */
  function createBlobCreatedRequest(containerName: string, blobName: string, csvContent: string): HttpRequest {
    const event = [{
      id: 'test-event-id',
      eventType: 'Microsoft.Storage.BlobCreated',
      subject: `/blobServices/default/containers/${containerName}/blobs/${blobName}`,
      data: {
        url: `https://storage.blob.core.windows.net/${containerName}/${blobName}`,
        contentLength: csvContent.length,
      },
    }];

    // Mock getBlobStream to return the CSV content as a stream
    (getBlobStream as jest.Mock).mockImplementation(() => {
      return Promise.resolve(Readable.from(Buffer.from(csvContent)));
    });

    return {
      method: 'POST',
      url: 'https://func.azurewebsites.net/api/upload/event-grid',
      headers: new Map([['aeg-event-type', 'Notification']]),
      json: jest.fn().mockResolvedValue(event),
    } as unknown as HttpRequest;
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

  describe('Event Grid subscription validation', () => {
    it('should respond with validationResponse for subscription validation', async () => {
      const request = createValidationRequest();
      const context = createMockContext();

      const response = await uploadFileHttpHandler(request, context);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        validationResponse: 'test-validation-code',
      });
    });
  });

  describe('Billing file processing', () => {
    it('should create audit log and batch record for valid billing file', async () => {
      const validCsvContent = [
        'MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT,USAGE_TYPE',
        '9518050018246830,0139,E10001,1,O,20240115,20241201,,,',
      ].join('\n');

      const request = createBlobCreatedRequest('billing-input', 'V21/V21.P.20260113.0001.input', validCsvContent);
      const context = createMockContext();

      const response = await uploadFileHttpHandler(request, context);

      expect(response.status).toBe(200);

      // Verify audit log was created
      const auditInserts = getAuditLogInserts();
      expect(auditInserts.length).toBeGreaterThan(0);

      // Verify batch record was created
      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);
    });

    it('should reject file with invalid headers', async () => {
      const invalidCsvContent = 'WRONG_COL1,WRONG_COL2\ndata1,data2';

      const request = createBlobCreatedRequest('billing-input', 'V21/V21.P.20260113.0002.input', invalidCsvContent);
      const context = createMockContext();

      const response = await uploadFileHttpHandler(request, context);

      // Should return error status
      expect(response.status).toBeGreaterThanOrEqual(400);

      // Should still create audit log with FILE_REJECTED
      const auditInserts = getAuditLogInserts();
      const fileRejectedInsert = auditInserts.find(
        call => call.params.messageCode === AuditMessageCodes.FILE_REJECTED
      );
      expect(fileRejectedInsert).toBeDefined();
    });
  });

  describe('Mastercard response file processing', () => {
    it('should create batch record for MC response file', async () => {
      const mcResponseCsv = [
        'apiOperation,correlationId,sourceOfFunds.type,sourceOfFunds.provided.card.number,sourceOfFunds.provided.card.expiry.month,sourceOfFunds.provided.card.expiry.year,result,error.cause,error.explanation,error.field,error.supportCode,error.validationType,token,schemeToken.status,sourceOfFunds.provided.card.fundingMethod,sourceOfFunds.provided.card.expiry,sourceOfFunds.provided.card.scheme',
        ',9518050018246830,CARD,411111******1111,,,SUCCESS,,,,,9876543210123456,ACTIVE,CREDIT,1226,VISA',
      ].join('\n');

      const request = createBlobCreatedRequest('mastercard-mapping', 'V21.P.20260114.0001.mc.response', mcResponseCsv);
      const context = createMockContext();

      const response = await uploadFileHttpHandler(request, context);

      expect(response.status).toBe(200);

      // MC response should also create a batch record
      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);
    });

    it('should parse SOURCE_ID from MC response filename', async () => {
      const mcResponseCsv = [
        'apiOperation,correlationId,sourceOfFunds.type,sourceOfFunds.provided.card.number,sourceOfFunds.provided.card.expiry.month,sourceOfFunds.provided.card.expiry.year,result,error.cause,error.explanation,error.field,error.supportCode,error.validationType,token,schemeToken.status,sourceOfFunds.provided.card.fundingMethod,sourceOfFunds.provided.card.expiry,sourceOfFunds.provided.card.scheme',
        ',9518050018246830,CARD,411111******1111,,,SUCCESS,,,,,9876543210123456,ACTIVE,CREDIT,1226,VISA',
      ].join('\n');

      const request = createBlobCreatedRequest('mastercard-mapping', 'V21.P.20260114.0002.mc.response', mcResponseCsv);
      const context = createMockContext();

      await uploadFileHttpHandler(request, context);

      const batchInserts = getBatchInserts();
      expect(batchInserts.length).toBeGreaterThan(0);

      const batchInsert = batchInserts[0];
      expect(batchInsert.params.sourceId).toBe('V21');
    });
  });
});
