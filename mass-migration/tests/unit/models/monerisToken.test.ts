import {
  mapCsvRowToMonerisToken,
  toMonerisTokenStaging,
  parseTrailer,
  MonerisTokenRecord,
} from '../../../src/models/monerisToken';

describe('MonerisToken Model', () => {
  describe('mapCsvRowToMonerisToken', () => {
    it('should map CSV row to MonerisTokenRecord', () => {
      const row: Record<string, string> = {
        MONERIS_TOKEN: '9518050018246830',
        EXP_DATE: '0139',
        ENTITY_ID: 'E10001',
        ENTITY_TYPE: '1',
        ENTITY_STS: 'O',
        CREATION_DATE: '20240115',
        LAST_USE_DATE: '20241201',
        TRX_SEQ_NO: '',
        BUSINESS_UNIT: '',
      };

      const result = mapCsvRowToMonerisToken(row);

      expect(result.monerisToken).toBe('9518050018246830');
      expect(result.expDate).toBe('0139');
      expect(result.entityId).toBe('E10001');
      expect(result.entityType).toBe('1');
      expect(result.entitySts).toBe('O');
      expect(result.creationDate).toBe('20240115');
      expect(result.lastUseDate).toBe('20241201');
      expect(result.trxSeqNo).toBeNull();
      expect(result.businessUnit).toBeNull();
    });

    it('should handle missing fields', () => {
      const row: Record<string, string> = {
        MONERIS_TOKEN: '9518050018246830',
      };

      const result = mapCsvRowToMonerisToken(row);

      expect(result.monerisToken).toBe('9518050018246830');
      expect(result.expDate).toBeNull();
      expect(result.entityId).toBeNull();
    });

    it('should trim whitespace', () => {
      const row: Record<string, string> = {
        MONERIS_TOKEN: '  9518050018246830  ',
        EXP_DATE: '  0139  ',
      };

      const result = mapCsvRowToMonerisToken(row);

      expect(result.monerisToken).toBe('9518050018246830');
      expect(result.expDate).toBe('0139');
    });
  });

  describe('toMonerisTokenStaging', () => {
    it('should convert record to staging format', () => {
      const record: MonerisTokenRecord = {
        monerisToken: '9518050018246830',
        expDate: '0139',
        entityId: 'E10001',
        entityType: '1',
        entitySts: 'O',
        creationDate: '20240115',
        lastUseDate: '20241201',
        trxSeqNo: null,
        businessUnit: null,
      };

      const result = toMonerisTokenStaging(record, 'FILE001');

      expect(result.fileId).toBe('FILE001');
      expect(result.monerisToken).toBe('9518050018246830');
      expect(result.expDate).toBe('0139');
      expect(result.validationStatus).toBe('PENDING');
      expect(result.migrationStatus).toBe('PENDING');
      expect(result.updatedBy).toBe('SYSTEM');
    });

    it('should parse creation date correctly', () => {
      const record: MonerisTokenRecord = {
        monerisToken: '9518050018246830',
        expDate: null,
        entityId: null,
        entityType: null,
        entitySts: null,
        creationDate: '20240115',
        lastUseDate: null,
        trxSeqNo: null,
        businessUnit: null,
      };

      const result = toMonerisTokenStaging(record, 'FILE001');

      expect(result.creationDate).toBeInstanceOf(Date);
      expect(result.creationDate?.getFullYear()).toBe(2024);
      expect(result.creationDate?.getMonth()).toBe(0); // January is 0
      expect(result.creationDate?.getDate()).toBe(15);
    });

    it('should handle invalid date format', () => {
      const record: MonerisTokenRecord = {
        monerisToken: '9518050018246830',
        expDate: null,
        entityId: null,
        entityType: null,
        entitySts: null,
        creationDate: 'invalid',
        lastUseDate: null,
        trxSeqNo: null,
        businessUnit: null,
      };

      const result = toMonerisTokenStaging(record, 'FILE001');

      expect(result.creationDate).toBeNull();
    });
  });

  describe('parseTrailer', () => {
    it('should parse standard trailer', () => {
      const result = parseTrailer('0000001033,20251208141500');

      expect(result).not.toBeNull();
      expect(result?.transactionCount).toBe(1033);
      expect(result?.timestamp).toBe('20251208141500');
    });

    it('should handle large transaction count', () => {
      const result = parseTrailer('9999999999,20251208141500');

      expect(result?.transactionCount).toBe(9999999999);
    });

    it('should return null for invalid format', () => {
      const result = parseTrailer('invalid');

      expect(result).toBeNull();
    });

    it('should return null for non-numeric count', () => {
      const result = parseTrailer('abc,20251208141500');

      expect(result).toBeNull();
    });
  });
});
