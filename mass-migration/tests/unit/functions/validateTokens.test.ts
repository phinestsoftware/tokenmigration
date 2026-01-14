/**
 * Unit tests for validateTokens function
 * Tests that validation error messages are properly recorded in MIGRATION_ERROR_DETAILS
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

describe('validateTokens - Error message recording in MIGRATION_ERROR_DETAILS', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for batch update query
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

  describe('When validation errors occur', () => {
    // Helper to create tokens with some valid ones to avoid threshold failure
    function createTokensWithInvalid(invalidToken: {
      ID: number;
      MONERIS_TOKEN: string;
      EXP_DATE: string | null;
      ENTITY_ID: string;
      ENTITY_TYPE: string;
      ENTITY_STS: string;
    }) {
      return [
        // Add valid tokens to keep below 50% failure threshold
        {
          ID: 100,
          MONERIS_TOKEN: '9518050018246800',
          EXP_DATE: '1230',
          ENTITY_ID: 'E10100',
          ENTITY_TYPE: '1',
          ENTITY_STS: 'O',
        },
        {
          ID: 101,
          MONERIS_TOKEN: '9518050018246801',
          EXP_DATE: '1230',
          ENTITY_ID: 'E10101',
          ENTITY_TYPE: '1',
          ENTITY_STS: 'O',
        },
        {
          ID: 102,
          MONERIS_TOKEN: '9518050018246802',
          EXP_DATE: '1230',
          ENTITY_ID: 'E10102',
          ENTITY_TYPE: '1',
          ENTITY_STS: 'O',
        },
        // The invalid token
        invalidToken,
      ];
    }

    it('should record ERROR_MESSAGE for invalid token format', async () => {
      const fileId = 'V21.P.20260113.0001';

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('SELECT ID, MONERIS_TOKEN')) {
          return Promise.resolve({
            recordset: createTokensWithInvalid({
              ID: 1,
              MONERIS_TOKEN: '1234567890123456', // Invalid - doesn't start with 9
              EXP_DATE: '1230',
              ENTITY_ID: 'E10001',
              ENTITY_TYPE: '1',
              ENTITY_STS: 'O',
            }),
          });
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

      const [tableName, columns, rows] = errorInsertCall;

      // Verify ERROR_MESSAGE column is included
      expect(columns).toContain('ERROR_MESSAGE');

      // Find the invalid token error
      const invalidTokenError = rows.find(
        (r: { ERROR_CODE: string }) => r.ERROR_CODE === ValidationErrors.INVALID_TOKEN_PREFIX
      );
      expect(invalidTokenError).toBeDefined();
      expect(invalidTokenError.ERROR_MESSAGE).toBeDefined();
      expect(invalidTokenError.ERROR_MESSAGE).not.toBeNull();
      expect(invalidTokenError.ERROR_MESSAGE.length).toBeGreaterThan(0);
      expect(invalidTokenError.ERROR_MESSAGE).toContain('9'); // Should mention token must start with 9
    });

    it('should record ERROR_MESSAGE for invalid token length', async () => {
      const fileId = 'V21.P.20260113.0002';

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('SELECT ID, MONERIS_TOKEN')) {
          return Promise.resolve({
            recordset: createTokensWithInvalid({
              ID: 1,
              MONERIS_TOKEN: '951805001', // Invalid - too short
              EXP_DATE: '1230',
              ENTITY_ID: 'E10001',
              ENTITY_TYPE: '1',
              ENTITY_STS: 'O',
            }),
          });
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
      const invalidTokenError = rows.find(
        (r: { ERROR_CODE: string }) => r.ERROR_CODE === ValidationErrors.INVALID_TOKEN_LENGTH
      );
      expect(invalidTokenError).toBeDefined();
      expect(invalidTokenError.ERROR_MESSAGE).toBeDefined();
      expect(invalidTokenError.ERROR_MESSAGE).toContain('16'); // Should mention 16 digits
    });

    it('should record ERROR_MESSAGE for invalid expiry date', async () => {
      const fileId = 'V21.P.20260113.0003';

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('SELECT ID, MONERIS_TOKEN')) {
          return Promise.resolve({
            recordset: createTokensWithInvalid({
              ID: 1,
              MONERIS_TOKEN: '9518050018246830',
              EXP_DATE: '1325', // Invalid - month 13
              ENTITY_ID: 'E10001',
              ENTITY_TYPE: '1',
              ENTITY_STS: 'O',
            }),
          });
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
      const invalidTokenError = rows.find(
        (r: { ERROR_CODE: string }) => r.ERROR_CODE === ValidationErrors.INVALID_EXPIRY_DATE
      );
      expect(invalidTokenError).toBeDefined();
      expect(invalidTokenError.ERROR_MESSAGE).toBeDefined();
      expect(invalidTokenError.ERROR_MESSAGE.length).toBeGreaterThan(0);
    });

    it('should record ERROR_MESSAGE for invalid entity type', async () => {
      const fileId = 'V21.P.20260113.0004';

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('SELECT ID, MONERIS_TOKEN')) {
          return Promise.resolve({
            recordset: createTokensWithInvalid({
              ID: 1,
              MONERIS_TOKEN: '9518050018246830',
              EXP_DATE: '1230',
              ENTITY_ID: 'E10001',
              ENTITY_TYPE: '9', // Invalid - must be 1 or 2
              ENTITY_STS: 'O',
            }),
          });
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
      const invalidTokenError = rows.find(
        (r: { ERROR_CODE: string }) => r.ERROR_CODE === ValidationErrors.INVALID_ENTITY_TYPE
      );
      expect(invalidTokenError).toBeDefined();
      expect(invalidTokenError.ERROR_MESSAGE).toBeDefined();
      expect(invalidTokenError.ERROR_MESSAGE).toContain('1'); // Should mention valid values
    });

    it('should record ERROR_MESSAGE for duplicate tokens', async () => {
      const fileId = 'V21.P.20260113.0005';

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('SELECT ID, MONERIS_TOKEN')) {
          return Promise.resolve({
            recordset: [
              // Valid tokens
              {
                ID: 100,
                MONERIS_TOKEN: '9518050018246800',
                EXP_DATE: '1230',
                ENTITY_ID: 'E10100',
                ENTITY_TYPE: '1',
                ENTITY_STS: 'O',
              },
              {
                ID: 101,
                MONERIS_TOKEN: '9518050018246801',
                EXP_DATE: '1230',
                ENTITY_ID: 'E10101',
                ENTITY_TYPE: '1',
                ENTITY_STS: 'O',
              },
              // Original and duplicate
              {
                ID: 1,
                MONERIS_TOKEN: '9518050018246830',
                EXP_DATE: '1230',
                ENTITY_ID: 'E10001',
                ENTITY_TYPE: '1',
                ENTITY_STS: 'O',
              },
              {
                ID: 2,
                MONERIS_TOKEN: '9518050018246830', // Duplicate
                EXP_DATE: '1230',
                ENTITY_ID: 'E10002',
                ENTITY_TYPE: '1',
                ENTITY_STS: 'O',
              },
            ],
          });
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
      expect(rows[0].ERROR_CODE).toBe(ValidationErrors.DUPLICATE_TOKEN);
      expect(rows[0].ERROR_MESSAGE).toBeDefined();
      expect(rows[0].ERROR_MESSAGE.length).toBeGreaterThan(0);
    });
  });

  describe('When no validation errors occur', () => {
    it('should not insert any error details for valid tokens', async () => {
      const fileId = 'V21.P.20260113.0007';

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('SELECT ID, MONERIS_TOKEN')) {
          return Promise.resolve({
            recordset: [
              {
                ID: 1,
                MONERIS_TOKEN: '9518050018246830',
                EXP_DATE: '1225',
                ENTITY_ID: 'E10001',
                ENTITY_TYPE: '1',
                ENTITY_STS: 'O',
              },
            ],
          });
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
});
