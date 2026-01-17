/**
 * Unit tests for validateTokens function
 * Tests that validation error messages are properly recorded in MIGRATION_ERROR_DETAILS
 *
 * NOTE: With the hybrid validation approach, field validation (E001-E003, E005, E009-E011)
 * is done in SQL during bulk insert. This function:
 * 1. Reads counts of VALID/INVALID records (SQL already set these)
 * 2. Adds ERROR_MESSAGE for INVALID records to MIGRATION_ERROR_DETAILS
 * 3. Detects duplicates within file among VALID records (E007)
 * 4. Detects duplicates in Payment Hub among VALID records (E008)
 */

import { InvocationContext } from '@azure/functions';

// Mock the database service BEFORE importing validateTokens
const mockExecuteQuery = jest.fn();
const mockBulkUpdate = jest.fn();
const mockBulkInsertValues = jest.fn();

jest.mock('../../../src/services/database', () => ({
  executeQuery: mockExecuteQuery,
  bulkUpdate: mockBulkUpdate,
  bulkInsertValues: mockBulkInsertValues,
}));

// Mock the queue service
jest.mock('../../../src/services/queueService', () => ({
  queueCreateBatch: jest.fn().mockResolvedValue(undefined),
  decodeQueueMessage: jest.fn((msg: string) => JSON.parse(msg)),
}));

// Mock the email service
jest.mock('../../../src/services/emailService', () => ({
  sendValidationFailureEmail: jest.fn().mockResolvedValue(undefined),
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

// Mock config
jest.mock('../../../src/config/index', () => ({
  getConfig: jest.fn(() => ({
    FAILURE_THRESHOLD_PERCENT: 50,
  })),
  ValidationStatus: {
    PENDING: 'PENDING',
    VALID: 'VALID',
    INVALID: 'INVALID',
    DUPLICATE: 'DUPLICATE',
  },
}));

import { validateTokensHandler } from '../../../src/functions/validateTokens';
import { ValidationErrors } from '../../../src/services/validationService';

describe('validateTokens - Hybrid validation approach', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockExecuteQuery.mockResolvedValue({ recordset: [], rowsAffected: [1] });
    mockBulkUpdate.mockResolvedValue(1);
    mockBulkInsertValues.mockResolvedValue(1);
  });

  function createMockContext(): InvocationContext {
    return {
      functionName: 'validateTokens',
      invocationId: 'test-invocation-id',
      log: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as InvocationContext;
  }

  function createQueueMessage(fileId: string, sourceId: string = 'V21'): string {
    return JSON.stringify({
      fileId,
      context: 'MONERIS',
      sourceId,
      fileName: `${sourceId}.P.20260113.0001.input`,
    });
  }

  describe('ERROR_MESSAGE recording for INVALID records', () => {
    it('should insert ERROR_MESSAGE for records with ERROR_CODE E003 (wrong prefix)', async () => {
      const fileId = 'V21.P.20260113.0001';

      mockExecuteQuery.mockImplementation((query: string) => {
        // Count query - 3 valid, 1 invalid
        if (query.includes('GROUP BY VALIDATION_STATUS')) {
          return Promise.resolve({
            recordset: [
              { status: 'VALID', cnt: 3 },
              { status: 'INVALID', cnt: 1 },
            ],
          });
        }
        // Get invalid records
        if (query.includes('VALIDATION_STATUS = \'INVALID\'')) {
          return Promise.resolve({
            recordset: [
              {
                ID: 1,
                MONERIS_TOKEN: '1234567890123456',
                ENTITY_ID: 'E10001',
                ERROR_CODE: 'E003', // Wrong prefix - set by SQL
              },
            ],
          });
        }
        // Duplicate detection SQL - no duplicates
        if (query.includes('ROW_NUMBER()') || query.includes('PARTITION BY MONERIS_TOKEN')) {
          return Promise.resolve({ recordset: [{ rowsAffected: 0 }] });
        }
        // Payment Hub duplicate check - no duplicates
        if (query.includes('PMR_MONERIS_MAPPING')) {
          return Promise.resolve({ recordset: [] });
        }
        return Promise.resolve({ recordset: [], rowsAffected: [1] });
      });

      const context = createMockContext();
      const message = createQueueMessage(fileId);

      await validateTokensHandler(message, context);

      // Find the error insert call
      const errorInsertCall = mockBulkInsertValues.mock.calls.find(
        (call) => call[0] === 'MIGRATION_ERROR_DETAILS'
      );

      expect(errorInsertCall).toBeDefined();
      const [, columns, rows] = errorInsertCall;

      expect(columns).toContain('ERROR_MESSAGE');
      expect(rows[0].ERROR_CODE).toBe('E003');
      expect(rows[0].ERROR_MESSAGE).toContain('9'); // Should mention token must start with 9
    });

    it('should insert ERROR_MESSAGE for records with ERROR_CODE E002 (wrong length)', async () => {
      const fileId = 'V21.P.20260113.0002';

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('GROUP BY VALIDATION_STATUS')) {
          return Promise.resolve({
            recordset: [
              { status: 'VALID', cnt: 3 },
              { status: 'INVALID', cnt: 1 },
            ],
          });
        }
        if (query.includes('VALIDATION_STATUS = \'INVALID\'')) {
          return Promise.resolve({
            recordset: [
              {
                ID: 1,
                MONERIS_TOKEN: '951805001',
                ENTITY_ID: 'E10001',
                ERROR_CODE: 'E002', // Wrong length - set by SQL
              },
            ],
          });
        }
        if (query.includes('ROW_NUMBER()') || query.includes('PARTITION BY MONERIS_TOKEN')) {
          return Promise.resolve({ recordset: [{ rowsAffected: 0 }] });
        }
        if (query.includes('PMR_MONERIS_MAPPING')) {
          return Promise.resolve({ recordset: [] });
        }
        return Promise.resolve({ recordset: [], rowsAffected: [1] });
      });

      const context = createMockContext();
      const message = createQueueMessage(fileId);

      await validateTokensHandler(message, context);

      const errorInsertCall = mockBulkInsertValues.mock.calls.find(
        (call) => call[0] === 'MIGRATION_ERROR_DETAILS'
      );

      expect(errorInsertCall).toBeDefined();
      const [, columns, rows] = errorInsertCall;

      expect(columns).toContain('ERROR_MESSAGE');
      expect(rows[0].ERROR_CODE).toBe('E002');
      expect(rows[0].ERROR_MESSAGE).toContain('16'); // Should mention 16 digits
    });

    it('should insert ERROR_MESSAGE for records with ERROR_CODE E005 (invalid expiry)', async () => {
      const fileId = 'V21.P.20260113.0003';

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('GROUP BY VALIDATION_STATUS')) {
          return Promise.resolve({
            recordset: [
              { status: 'VALID', cnt: 3 },
              { status: 'INVALID', cnt: 1 },
            ],
          });
        }
        if (query.includes('VALIDATION_STATUS = \'INVALID\'')) {
          return Promise.resolve({
            recordset: [
              {
                ID: 1,
                MONERIS_TOKEN: '9518050018246830',
                ENTITY_ID: 'E10001',
                ERROR_CODE: 'E005', // Invalid expiry - set by SQL
              },
            ],
          });
        }
        if (query.includes('ROW_NUMBER()') || query.includes('PARTITION BY MONERIS_TOKEN')) {
          return Promise.resolve({ recordset: [{ rowsAffected: 0 }] });
        }
        if (query.includes('PMR_MONERIS_MAPPING')) {
          return Promise.resolve({ recordset: [] });
        }
        return Promise.resolve({ recordset: [], rowsAffected: [1] });
      });

      const context = createMockContext();
      const message = createQueueMessage(fileId);

      await validateTokensHandler(message, context);

      const errorInsertCall = mockBulkInsertValues.mock.calls.find(
        (call) => call[0] === 'MIGRATION_ERROR_DETAILS'
      );

      expect(errorInsertCall).toBeDefined();
      const [, columns, rows] = errorInsertCall;

      expect(columns).toContain('ERROR_MESSAGE');
      expect(rows[0].ERROR_CODE).toBe('E005');
      expect(rows[0].ERROR_MESSAGE).toBeDefined();
      expect(rows[0].ERROR_MESSAGE.length).toBeGreaterThan(0);
    });

    it('should insert ERROR_MESSAGE for records with ERROR_CODE E009 (invalid entity type)', async () => {
      const fileId = 'V21.P.20260113.0004';

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('GROUP BY VALIDATION_STATUS')) {
          return Promise.resolve({
            recordset: [
              { status: 'VALID', cnt: 3 },
              { status: 'INVALID', cnt: 1 },
            ],
          });
        }
        if (query.includes('VALIDATION_STATUS = \'INVALID\'')) {
          return Promise.resolve({
            recordset: [
              {
                ID: 1,
                MONERIS_TOKEN: '9518050018246830',
                ENTITY_ID: 'E10001',
                ERROR_CODE: 'E009', // Invalid entity type - set by SQL
              },
            ],
          });
        }
        if (query.includes('ROW_NUMBER()') || query.includes('PARTITION BY MONERIS_TOKEN')) {
          return Promise.resolve({ recordset: [{ rowsAffected: 0 }] });
        }
        if (query.includes('PMR_MONERIS_MAPPING')) {
          return Promise.resolve({ recordset: [] });
        }
        return Promise.resolve({ recordset: [], rowsAffected: [1] });
      });

      const context = createMockContext();
      const message = createQueueMessage(fileId);

      await validateTokensHandler(message, context);

      const errorInsertCall = mockBulkInsertValues.mock.calls.find(
        (call) => call[0] === 'MIGRATION_ERROR_DETAILS'
      );

      expect(errorInsertCall).toBeDefined();
      const [, columns, rows] = errorInsertCall;

      expect(columns).toContain('ERROR_MESSAGE');
      expect(rows[0].ERROR_CODE).toBe('E009');
      expect(rows[0].ERROR_MESSAGE).toContain('1'); // Should mention valid values
    });
  });

  describe('Duplicate detection within file', () => {
    it('should detect and mark duplicate tokens within file using SQL', async () => {
      const fileId = 'V21.P.20260113.0005';

      let duplicateUpdateExecuted = false;

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('GROUP BY VALIDATION_STATUS')) {
          return Promise.resolve({
            recordset: [
              { status: 'VALID', cnt: 4 },
            ],
          });
        }
        if (query.includes('VALIDATION_STATUS = \'INVALID\'')) {
          return Promise.resolve({ recordset: [] });
        }
        // Duplicate detection SQL with ROW_NUMBER
        if (query.includes('ROW_NUMBER()') && query.includes('PARTITION BY MONERIS_TOKEN')) {
          duplicateUpdateExecuted = true;
          return Promise.resolve({ recordset: [{ rowsAffected: 1 }] }); // 1 duplicate found
        }
        // Query for duplicate records to insert error details
        if (query.includes('VALIDATION_STATUS = \'DUPLICATE\'') && query.includes('ERROR_CODE = \'E007\'')) {
          return Promise.resolve({
            recordset: [
              { MONERIS_TOKEN: '9518050018246830', ENTITY_ID: 'E10002' },
            ],
          });
        }
        if (query.includes('PMR_MONERIS_MAPPING')) {
          return Promise.resolve({ recordset: [] });
        }
        return Promise.resolve({ recordset: [], rowsAffected: [1] });
      });

      const context = createMockContext();
      const message = createQueueMessage(fileId);

      await validateTokensHandler(message, context);

      expect(duplicateUpdateExecuted).toBe(true);

      // Should insert error details for the duplicate
      const errorInsertCall = mockBulkInsertValues.mock.calls.find(
        (call) => call[0] === 'MIGRATION_ERROR_DETAILS'
      );

      expect(errorInsertCall).toBeDefined();
      const [, columns, rows] = errorInsertCall;

      expect(columns).toContain('ERROR_MESSAGE');
      expect(rows[0].ERROR_CODE).toBe(ValidationErrors.DUPLICATE_TOKEN);
      expect(rows[0].ERROR_MESSAGE).toBeDefined();
    });
  });

  describe('No validation errors', () => {
    it('should not insert any error details when all tokens are valid', async () => {
      const fileId = 'V21.P.20260113.0007';

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('GROUP BY VALIDATION_STATUS')) {
          return Promise.resolve({
            recordset: [
              { status: 'VALID', cnt: 5 },
            ],
          });
        }
        if (query.includes('VALIDATION_STATUS = \'INVALID\'')) {
          return Promise.resolve({ recordset: [] }); // No invalid records
        }
        if (query.includes('ROW_NUMBER()') || query.includes('PARTITION BY MONERIS_TOKEN')) {
          return Promise.resolve({ recordset: [{ rowsAffected: 0 }] }); // No duplicates
        }
        if (query.includes('VALIDATION_STATUS = \'DUPLICATE\'')) {
          return Promise.resolve({ recordset: [] });
        }
        if (query.includes('PMR_MONERIS_MAPPING')) {
          return Promise.resolve({ recordset: [] }); // No Payment Hub duplicates
        }
        return Promise.resolve({ recordset: [], rowsAffected: [1] });
      });

      const context = createMockContext();
      const message = createQueueMessage(fileId);

      await validateTokensHandler(message, context);

      // Should not have any error inserts
      const errorInsertCall = mockBulkInsertValues.mock.calls.find(
        (call) => call[0] === 'MIGRATION_ERROR_DETAILS'
      );

      expect(errorInsertCall).toBeUndefined();
    });
  });

  describe('Audit log count validation (Bug #40)', () => {
    it('should have counts that add up correctly when Payment Hub duplicates are found', async () => {
      const fileId = 'V21.P.20260113.0040';

      mockExecuteQuery.mockImplementation((query: string) => {
        // SQL validation already set: 40 invalid, 32 valid
        if (query.includes('GROUP BY VALIDATION_STATUS')) {
          return Promise.resolve({
            recordset: [
              { status: 'VALID', cnt: 32 },
              { status: 'INVALID', cnt: 40 },
            ],
          });
        }
        // 40 invalid records
        if (query.includes('VALIDATION_STATUS = \'INVALID\'')) {
          const invalidRecords = Array.from({ length: 40 }, (_, i) => ({
            ID: i + 1,
            MONERIS_TOKEN: `123456789012345${i}`,
            ENTITY_ID: `E${10000 + i}`,
            ERROR_CODE: 'E003',
          }));
          return Promise.resolve({ recordset: invalidRecords });
        }
        // No in-file duplicates
        if (query.includes('ROW_NUMBER()') || query.includes('PARTITION BY MONERIS_TOKEN')) {
          return Promise.resolve({ recordset: [{ rowsAffected: 0 }] });
        }
        if (query.includes('VALIDATION_STATUS = \'DUPLICATE\'')) {
          return Promise.resolve({ recordset: [] });
        }
        // All 32 valid tokens are duplicates in Payment Hub
        if (query.includes('PMR_MONERIS_MAPPING')) {
          return Promise.resolve({
            recordset: Array.from({ length: 32 }, (_, i) => ({
              ID: 100 + i,
              MONERIS_TOKEN: `951805001824${6800 + i}`,
              PMR: `851805001824${6800 + i}`,
            })),
          });
        }
        return Promise.resolve({ recordset: [], rowsAffected: [1] });
      });

      const context = createMockContext();
      const message = createQueueMessage(fileId);

      // Should throw because 100% failure rate exceeds threshold
      try {
        await validateTokensHandler(message, context);
      } catch {
        // Expected
      }

      // Find the audit log insert call
      const auditLogCall = mockExecuteQuery.mock.calls.find(
        (call) => call[0].includes('INSERT INTO TOKEN_MIGRATION_AUDIT_LOG') &&
                  call[1]?.messageCode === 'TOKEN_VALID'
      );

      expect(auditLogCall).toBeDefined();

      const additionalInfo = JSON.parse(auditLogCall[1].additionalInfo);
      const { validCount, invalidCount, duplicateCount, totalCount } = additionalInfo;

      // Counts must add up
      expect(validCount + invalidCount + duplicateCount).toBe(totalCount);
      expect(totalCount).toBe(72);
      expect(invalidCount).toBe(40);
      expect(duplicateCount).toBe(32); // All from Payment Hub
      expect(validCount).toBe(0);
    });

    it('should correctly count when some valid tokens are duplicates in Payment Hub', async () => {
      const fileId = 'V21.P.20260113.0041';

      mockExecuteQuery.mockImplementation((query: string) => {
        // 8 valid, 2 invalid from SQL validation
        if (query.includes('GROUP BY VALIDATION_STATUS')) {
          return Promise.resolve({
            recordset: [
              { status: 'VALID', cnt: 8 },
              { status: 'INVALID', cnt: 2 },
            ],
          });
        }
        // 2 invalid records
        if (query.includes('VALIDATION_STATUS = \'INVALID\'')) {
          return Promise.resolve({
            recordset: [
              { ID: 1, MONERIS_TOKEN: '1234567890123456', ENTITY_ID: 'E1', ERROR_CODE: 'E003' },
              { ID: 2, MONERIS_TOKEN: '2234567890123456', ENTITY_ID: 'E2', ERROR_CODE: 'E003' },
            ],
          });
        }
        // No in-file duplicates
        if (query.includes('ROW_NUMBER()') || query.includes('PARTITION BY MONERIS_TOKEN')) {
          return Promise.resolve({ recordset: [{ rowsAffected: 0 }] });
        }
        if (query.includes('VALIDATION_STATUS = \'DUPLICATE\'')) {
          return Promise.resolve({ recordset: [] });
        }
        // 3 valid tokens are duplicates in Payment Hub
        if (query.includes('PMR_MONERIS_MAPPING')) {
          return Promise.resolve({
            recordset: [
              { ID: 3, MONERIS_TOKEN: '9518050018246803', PMR: '8518050018246803' },
              { ID: 4, MONERIS_TOKEN: '9518050018246804', PMR: '8518050018246804' },
              { ID: 5, MONERIS_TOKEN: '9518050018246805', PMR: '8518050018246805' },
            ],
          });
        }
        return Promise.resolve({ recordset: [], rowsAffected: [1] });
      });

      const context = createMockContext();
      const message = createQueueMessage(fileId);

      await validateTokensHandler(message, context);

      // Find the audit log insert call
      const auditLogCall = mockExecuteQuery.mock.calls.find(
        (call) => call[0].includes('INSERT INTO TOKEN_MIGRATION_AUDIT_LOG') &&
                  call[1]?.messageCode === 'TOKEN_VALID'
      );

      expect(auditLogCall).toBeDefined();

      const additionalInfo = JSON.parse(auditLogCall[1].additionalInfo);
      const { validCount, invalidCount, duplicateCount, totalCount } = additionalInfo;

      // Counts must add up
      expect(validCount + invalidCount + duplicateCount).toBe(totalCount);
      expect(totalCount).toBe(10);
      expect(invalidCount).toBe(2);
      expect(duplicateCount).toBe(3); // 3 from Payment Hub
      expect(validCount).toBe(5);     // 8 - 3 = 5
    });
  });
});
