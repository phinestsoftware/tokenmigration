import {
  parseCsv,
  generateCsv,
  generateTrailer,
  formatTimestamp,
  validateFileStructure,
  splitIntoChunks,
  generateMcInputFile,
} from '../../../src/utils/fileParser';

describe('FileParser', () => {
  describe('parseCsv', () => {
    it('should parse CSV with header', () => {
      const content = `NAME,VALUE
John,100
Jane,200`;

      const result = parseCsv<{ NAME: string; VALUE: string }>(content);

      expect(result.records.length).toBe(2);
      expect(result.records[0].NAME).toBe('John');
      expect(result.records[0].VALUE).toBe('100');
      expect(result.header).toEqual(['NAME', 'VALUE']);
    });

    it('should detect and extract trailer', () => {
      const content = `MONERIS_TOKEN,EXP_DATE
9518050018246830,1225
9518050018246831,0626
0000000002,20251208141500`;

      const result = parseCsv<{ MONERIS_TOKEN: string; EXP_DATE: string }>(content);

      expect(result.records.length).toBe(2);
      expect(result.trailer).toBe('0000000002,20251208141500');
    });

    it('should handle empty content', () => {
      const result = parseCsv<Record<string, string>>('');

      expect(result.records.length).toBe(0);
      expect(result.header).toBeNull();
      expect(result.trailer).toBeNull();
    });

    it('should trim fields when configured', () => {
      const content = `NAME,VALUE
  John  ,  100  `;

      const result = parseCsv<{ NAME: string; VALUE: string }>(content, { trimFields: true });

      expect(result.records[0].NAME).toBe('John');
      expect(result.records[0].VALUE).toBe('100');
    });

    it('should use custom delimiter', () => {
      const content = `NAME|VALUE
John|100`;

      const result = parseCsv<{ NAME: string; VALUE: string }>(content, { delimiter: '|' });

      expect(result.records[0].NAME).toBe('John');
      expect(result.records[0].VALUE).toBe('100');
    });
  });

  describe('generateCsv', () => {
    it('should generate CSV with header', () => {
      const records = [
        { NAME: 'John', VALUE: '100' },
        { NAME: 'Jane', VALUE: '200' },
      ];

      const result = generateCsv(records, ['NAME', 'VALUE']);

      expect(result).toContain('NAME,VALUE');
      expect(result).toContain('John,100');
      expect(result).toContain('Jane,200');
    });

    it('should include trailer when provided', () => {
      const records = [{ TOKEN: '9518050018246830' }];

      const result = generateCsv(records, ['TOKEN'], { trailer: '0000000001,20251208141500' });

      expect(result).toContain('0000000001,20251208141500');
    });

    it('should handle empty records', () => {
      const result = generateCsv([], ['NAME', 'VALUE'], { includeHeader: true });

      expect(result).toContain('NAME,VALUE');
    });
  });

  describe('generateTrailer', () => {
    it('should format transaction count with leading zeros', () => {
      const result = generateTrailer(1033);

      expect(result).toContain('0000001033');
    });

    it('should include BU and SOURCE_ID when provided', () => {
      const result = generateTrailer(100, { businessUnit: 'WL', sourceId: 'V21' });

      expect(result).toContain('BU=WL');
      expect(result).toContain('SOURCE_ID=V21');
      expect(result).toContain('TRANSACTION_COUNT=0000000100');
    });

    it('should handle large counts', () => {
      const result = generateTrailer(9999999999);

      expect(result).toContain('9999999999');
    });
  });

  describe('formatTimestamp', () => {
    it('should format date as YYYYMMDDHH24MISS', () => {
      const date = new Date('2025-12-08T14:30:45');
      const result = formatTimestamp(date);

      expect(result).toBe('20251208143045');
    });

    it('should pad single digit values', () => {
      const date = new Date('2025-01-05T09:05:05');
      const result = formatTimestamp(date);

      expect(result).toBe('20250105090505');
    });
  });

  describe('validateFileStructure', () => {
    it('should validate file with all required columns', () => {
      const content = `MONERIS_TOKEN,EXP_DATE,ENTITY_ID
9518050018246830,1225,E10001`;

      const result = validateFileStructure(content, ['MONERIS_TOKEN', 'EXP_DATE', 'ENTITY_ID']);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing columns', () => {
      const content = `MONERIS_TOKEN,EXP_DATE
9518050018246830,1225`;

      const result = validateFileStructure(content, ['MONERIS_TOKEN', 'EXP_DATE', 'ENTITY_ID']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required column: ENTITY_ID');
    });

    it('should reject empty file', () => {
      const result = validateFileStructure('', ['MONERIS_TOKEN']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should reject file with only header', () => {
      const content = 'MONERIS_TOKEN,EXP_DATE';

      const result = validateFileStructure(content, ['MONERIS_TOKEN', 'EXP_DATE']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File has no data rows');
    });
  });

  describe('splitIntoChunks', () => {
    it('should split array into equal chunks', () => {
      const array = [1, 2, 3, 4, 5, 6];
      const result = splitIntoChunks(array, 2);

      expect(result.length).toBe(3);
      expect(result[0]).toEqual([1, 2]);
      expect(result[1]).toEqual([3, 4]);
      expect(result[2]).toEqual([5, 6]);
    });

    it('should handle remainder in last chunk', () => {
      const array = [1, 2, 3, 4, 5];
      const result = splitIntoChunks(array, 2);

      expect(result.length).toBe(3);
      expect(result[2]).toEqual([5]);
    });

    it('should handle empty array', () => {
      const result = splitIntoChunks([], 2);

      expect(result.length).toBe(0);
    });

    it('should handle chunk size larger than array', () => {
      const array = [1, 2, 3];
      const result = splitIntoChunks(array, 10);

      expect(result.length).toBe(1);
      expect(result[0]).toEqual([1, 2, 3]);
    });
  });

  describe('generateMcInputFile', () => {
    it('should generate MC input file format', () => {
      const tokens = [
        { monerisToken: '9518050018246830', expDate: '0139' },
        { monerisToken: '9518050018246831', expDate: '0625' },
      ];

      const result = generateMcInputFile(tokens, 'V21', 'WL');

      expect(result).toContain('MONERIS_TOKEN,EXP_DATE_MM,EXP_DATE_YY');
      expect(result).toContain('9518050018246830,01,39');
      expect(result).toContain('9518050018246831,06,25');
      expect(result).toContain('BU=WL');
      expect(result).toContain('SOURCE_ID=V21');
      expect(result).toContain('TRANSACTION_COUNT=0000000002');
    });

    it('should handle null expiry dates', () => {
      const tokens = [{ monerisToken: '9518050018246830', expDate: null }];

      const result = generateMcInputFile(tokens, 'V21');

      expect(result).toContain('9518050018246830,,');
    });
  });
});
