import {
  validateMonerisToken,
  validateExpiryDate,
  validateEntityType,
  validateEntityStatus,
  validateMonerisTokenRecord,
  validateTokenBatch,
  isFailureThresholdExceeded,
  ValidationErrors,
} from '../../../src/services/validationService';
import { ValidationStatus } from '../../../src/config';
import { MonerisTokenRecord } from '../../../src/models/monerisToken';

describe('ValidationService', () => {
  describe('validateMonerisToken', () => {
    it('should validate a correct Moneris token', () => {
      const result = validateMonerisToken('9518050018246830');
      expect(result.isValid).toBe(true);
      expect(result.status).toBe(ValidationStatus.VALID);
    });

    it('should reject empty token', () => {
      const result = validateMonerisToken('');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrors.INVALID_TOKEN_FORMAT);
    });

    it('should reject token with wrong length', () => {
      const result = validateMonerisToken('951805001');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrors.INVALID_TOKEN_LENGTH);
    });

    it('should reject token with non-numeric characters', () => {
      const result = validateMonerisToken('951805001824683A');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrors.INVALID_TOKEN_FORMAT);
    });

    it('should reject token not starting with 9', () => {
      const result = validateMonerisToken('1518050018246830');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrors.INVALID_TOKEN_PREFIX);
    });

    it('should handle whitespace in token', () => {
      const result = validateMonerisToken(' 9518050018246830 ');
      // Whitespace should cause length mismatch
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateExpiryDate', () => {
    it('should validate correct expiry date', () => {
      const result = validateExpiryDate('1225');
      expect(result.isValid).toBe(true);
    });

    it('should accept null expiry date (optional)', () => {
      const result = validateExpiryDate(null);
      expect(result.isValid).toBe(true);
    });

    it('should accept undefined expiry date (optional)', () => {
      const result = validateExpiryDate(undefined);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid format', () => {
      const result = validateExpiryDate('12/25');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrors.INVALID_EXPIRY_DATE);
    });

    it('should reject invalid month (13)', () => {
      const result = validateExpiryDate('1325');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrors.INVALID_EXPIRY_DATE);
    });

    it('should reject invalid month (00)', () => {
      const result = validateExpiryDate('0025');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrors.INVALID_EXPIRY_DATE);
    });

    it('should validate boundary month (01)', () => {
      const result = validateExpiryDate('0130');
      expect(result.isValid).toBe(true);
    });

    it('should validate boundary month (12)', () => {
      const result = validateExpiryDate('1230');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateEntityType', () => {
    it('should validate entity type 1 (Account)', () => {
      const result = validateEntityType('1');
      expect(result.isValid).toBe(true);
    });

    it('should validate entity type 2 (GUID)', () => {
      const result = validateEntityType('2');
      expect(result.isValid).toBe(true);
    });

    it('should accept null entity type (optional)', () => {
      const result = validateEntityType(null);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid entity type', () => {
      const result = validateEntityType('3');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrors.INVALID_ENTITY_TYPE);
    });
  });

  describe('validateEntityStatus', () => {
    it('should validate status O (Open)', () => {
      const result = validateEntityStatus('O');
      expect(result.isValid).toBe(true);
    });

    it('should validate status S (Suspended)', () => {
      const result = validateEntityStatus('S');
      expect(result.isValid).toBe(true);
    });

    it('should validate status N (Cancelled)', () => {
      const result = validateEntityStatus('N');
      expect(result.isValid).toBe(true);
    });

    it('should validate status C (Closed)', () => {
      const result = validateEntityStatus('C');
      expect(result.isValid).toBe(true);
    });

    it('should accept null entity status (optional)', () => {
      const result = validateEntityStatus(null);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid entity status', () => {
      const result = validateEntityStatus('X');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrors.INVALID_ENTITY_STATUS);
    });
  });

  describe('validateMonerisTokenRecord', () => {
    const validRecord: MonerisTokenRecord = {
      monerisToken: '9518050018246830',
      expDate: '1225',
      entityId: 'E10001',
      entityType: '1',
      entitySts: 'O',
      creationDate: '20240101',
      lastUseDate: '20241201',
      trxSeqNo: null,
      businessUnit: null,
    };

    it('should validate a complete valid record', () => {
      const result = validateMonerisTokenRecord(validRecord);
      expect(result.isValid).toBe(true);
    });

    it('should fail on invalid token', () => {
      const record = { ...validRecord, monerisToken: '1234' };
      const result = validateMonerisTokenRecord(record);
      expect(result.isValid).toBe(false);
    });

    it('should fail on invalid expiry date', () => {
      const record = { ...validRecord, expDate: '1325' };
      const result = validateMonerisTokenRecord(record);
      expect(result.isValid).toBe(false);
    });

    it('should fail on invalid entity type', () => {
      const record = { ...validRecord, entityType: '9' };
      const result = validateMonerisTokenRecord(record);
      expect(result.isValid).toBe(false);
    });

    it('should fail on invalid entity status', () => {
      const record = { ...validRecord, entitySts: 'X' };
      const result = validateMonerisTokenRecord(record);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateTokenBatch', () => {
    const createRecord = (token: string): MonerisTokenRecord => ({
      monerisToken: token,
      expDate: '1225',
      entityId: 'E10001',
      entityType: '1',
      entitySts: 'O',
      creationDate: null,
      lastUseDate: null,
      trxSeqNo: null,
      businessUnit: null,
    });

    it('should process batch of valid tokens', () => {
      const records = [
        createRecord('9518050018246830'),
        createRecord('9518050018246831'),
        createRecord('9518050018246832'),
      ];

      const result = validateTokenBatch(records);

      expect(result.valid.length).toBe(3);
      expect(result.invalid.length).toBe(0);
      expect(result.duplicates.length).toBe(0);
    });

    it('should detect duplicates within batch', () => {
      const records = [
        createRecord('9518050018246830'),
        createRecord('9518050018246830'), // duplicate
        createRecord('9518050018246831'),
      ];

      const result = validateTokenBatch(records);

      expect(result.valid.length).toBe(2);
      expect(result.duplicates.length).toBe(1);
    });

    it('should separate valid and invalid tokens', () => {
      const records = [
        createRecord('9518050018246830'), // valid
        createRecord('1234567890123456'), // invalid - wrong prefix
        createRecord('9518050018246831'), // valid
      ];

      const result = validateTokenBatch(records);

      expect(result.valid.length).toBe(2);
      expect(result.invalid.length).toBe(1);
    });
  });

  describe('isFailureThresholdExceeded', () => {
    it('should return false when below threshold', () => {
      const result = isFailureThresholdExceeded(100, 40, 50);
      expect(result).toBe(false);
    });

    it('should return false when at threshold', () => {
      const result = isFailureThresholdExceeded(100, 50, 50);
      expect(result).toBe(false);
    });

    it('should return true when above threshold', () => {
      const result = isFailureThresholdExceeded(100, 51, 50);
      expect(result).toBe(true);
    });

    it('should return false for empty batch', () => {
      const result = isFailureThresholdExceeded(0, 0, 50);
      expect(result).toBe(false);
    });

    it('should handle 100% failure rate', () => {
      const result = isFailureThresholdExceeded(100, 100, 50);
      expect(result).toBe(true);
    });

    it('should handle 0% failure rate', () => {
      const result = isFailureThresholdExceeded(100, 0, 50);
      expect(result).toBe(false);
    });
  });
});
