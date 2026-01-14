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

  describe('Audit log count validation (Bug #40)', () => {
    /**
     * Bug #40: TOKEN_MIGRATION_AUDIT_LOG has invalid counts
     * When checkExistingTokens finds duplicates in Payment Hub, the validCount
     * should be decremented but it wasn't, causing counts to not add up:
     * validCount + invalidCount + duplicateCount should equal totalCount
     */
    it('should have counts that add up correctly when Payment Hub duplicates are found', async () => {
      const fileId = 'V21.P.20260113.0040';

      // Simulate scenario: 72 tokens total
      // - 40 invalid (fail validation)
      // - 32 initially valid, but ALL are duplicates in Payment Hub
      const invalidTokens = Array.from({ length: 40 }, (_, i) => ({
        ID: i + 1,
        MONERIS_TOKEN: `123456789012345${i}`, // Invalid - doesn't start with 9
        EXP_DATE: '1230',
        ENTITY_ID: `E${10000 + i}`,
        ENTITY_TYPE: '1',
        ENTITY_STS: 'O',
      }));

      const validTokensThatAreDuplicatesInPHub = Array.from({ length: 32 }, (_, i) => ({
        ID: 100 + i,
        MONERIS_TOKEN: `951805001824${6800 + i}`, // Valid format
        EXP_DATE: '1230',
        ENTITY_ID: `E${20000 + i}`,
        ENTITY_TYPE: '1',
        ENTITY_STS: 'O',
      }));

      const allTokens = [...invalidTokens, ...validTokensThatAreDuplicatesInPHub];

      mockExecuteQuery.mockImplementation((query: string) => {
        // First query: get all tokens for validation
        if (query.includes('SELECT ID, MONERIS_TOKEN') && query.includes('VALIDATION_STATUS = \'PENDING\'')) {
          return Promise.resolve({ recordset: allTokens });
        }
        // Second query: checkExistingTokens - return all 32 valid tokens as duplicates in Payment Hub
        if (query.includes('SELECT m.ID, m.MONERIS_TOKEN') && query.includes('EXISTS')) {
          return Promise.resolve({
            recordset: validTokensThatAreDuplicatesInPHub.map(t => ({
              ID: t.ID,
              MONERIS_TOKEN: t.MONERIS_TOKEN,
            })),
          });
        }
        // Audit log insert - capture the counts
        if (query.includes('INSERT INTO TOKEN_MIGRATION_AUDIT_LOG')) {
          return Promise.resolve({ recordset: [], rowsAffected: [1] });
        }
        return Promise.resolve({ recordset: [], rowsAffected: [1] });
      });

      const context = createMockContext();
      const message = createQueueMessage(fileId);

      // This should throw because failure threshold is exceeded (100% failures)
      // but we want to check the audit log counts before that
      try {
        await validateTokensHandler(message, context);
      } catch {
        // Expected to throw due to threshold exceeded
      }

      // Find the audit log insert call
      const auditLogCall = mockExecuteQuery.mock.calls.find(
        (call) => call[0].includes('INSERT INTO TOKEN_MIGRATION_AUDIT_LOG') &&
                  call[1]?.messageCode === 'TOKEN_VALID'
      );

      expect(auditLogCall).toBeDefined();

      const additionalInfo = JSON.parse(auditLogCall[1].additionalInfo);
      const { validCount, invalidCount, duplicateCount, totalCount } = additionalInfo;

      // THE KEY ASSERTION: counts must add up!
      // validCount + invalidCount + duplicateCount should equal totalCount
      expect(validCount + invalidCount + duplicateCount).toBe(totalCount);

      // More specific assertions based on our test data:
      // - 72 total tokens
      // - 40 invalid
      // - 0 duplicates within file
      // - 32 duplicates in Payment Hub (were initially valid)
      // So: validCount should be 0, invalidCount should be 40, duplicateCount should be 32
      expect(totalCount).toBe(72);
      expect(invalidCount).toBe(40);
      expect(duplicateCount).toBe(32);
      expect(validCount).toBe(0); // All 32 "valid" tokens were found to be duplicates in PHub
    });

    it('should correctly count when some valid tokens are duplicates in Payment Hub', async () => {
      const fileId = 'V21.P.20260113.0041';

      // Simulate: 10 tokens total
      // - 2 invalid
      // - 8 initially valid, but 3 are duplicates in Payment Hub
      // Expected final: 5 valid, 2 invalid, 3 duplicate = 10 total
      const tokens = [
        // 2 invalid tokens
        { ID: 1, MONERIS_TOKEN: '1234567890123456', EXP_DATE: '1230', ENTITY_ID: 'E1', ENTITY_TYPE: '1', ENTITY_STS: 'O' },
        { ID: 2, MONERIS_TOKEN: '2234567890123456', EXP_DATE: '1230', ENTITY_ID: 'E2', ENTITY_TYPE: '1', ENTITY_STS: 'O' },
        // 8 valid tokens (3 will be found as duplicates in PHub)
        { ID: 3, MONERIS_TOKEN: '9518050018246803', EXP_DATE: '1230', ENTITY_ID: 'E3', ENTITY_TYPE: '1', ENTITY_STS: 'O' },
        { ID: 4, MONERIS_TOKEN: '9518050018246804', EXP_DATE: '1230', ENTITY_ID: 'E4', ENTITY_TYPE: '1', ENTITY_STS: 'O' },
        { ID: 5, MONERIS_TOKEN: '9518050018246805', EXP_DATE: '1230', ENTITY_ID: 'E5', ENTITY_TYPE: '1', ENTITY_STS: 'O' },
        { ID: 6, MONERIS_TOKEN: '9518050018246806', EXP_DATE: '1230', ENTITY_ID: 'E6', ENTITY_TYPE: '1', ENTITY_STS: 'O' },
        { ID: 7, MONERIS_TOKEN: '9518050018246807', EXP_DATE: '1230', ENTITY_ID: 'E7', ENTITY_TYPE: '1', ENTITY_STS: 'O' },
        { ID: 8, MONERIS_TOKEN: '9518050018246808', EXP_DATE: '1230', ENTITY_ID: 'E8', ENTITY_TYPE: '1', ENTITY_STS: 'O' },
        { ID: 9, MONERIS_TOKEN: '9518050018246809', EXP_DATE: '1230', ENTITY_ID: 'E9', ENTITY_TYPE: '1', ENTITY_STS: 'O' },
        { ID: 10, MONERIS_TOKEN: '9518050018246810', EXP_DATE: '1230', ENTITY_ID: 'E10', ENTITY_TYPE: '1', ENTITY_STS: 'O' },
      ];

      // 3 of the valid tokens are duplicates in Payment Hub
      const pHubDuplicates = [
        { ID: 3, MONERIS_TOKEN: '9518050018246803' },
        { ID: 4, MONERIS_TOKEN: '9518050018246804' },
        { ID: 5, MONERIS_TOKEN: '9518050018246805' },
      ];

      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('SELECT ID, MONERIS_TOKEN') && query.includes('VALIDATION_STATUS = \'PENDING\'')) {
          return Promise.resolve({ recordset: tokens });
        }
        if (query.includes('SELECT m.ID, m.MONERIS_TOKEN') && query.includes('EXISTS')) {
          return Promise.resolve({ recordset: pHubDuplicates });
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

      // Specific expectations:
      expect(totalCount).toBe(10);
      expect(invalidCount).toBe(2);
      expect(duplicateCount).toBe(3); // 3 duplicates from Payment Hub
      expect(validCount).toBe(5);     // 8 initially valid - 3 duplicates = 5
    });
  });
});
