import {
  parseFileName,
  generateFileId,
  generateBatchId,
  generateOutputFileName,
} from '../../../src/models/migrationBatch';

describe('MigrationBatch Model', () => {
  describe('parseFileName', () => {
    it('should parse standard file name', () => {
      const result = parseFileName('V21.P.20251208.0001.input');

      expect(result).not.toBeNull();
      expect(result?.sourceId).toBe('V21');
      expect(result?.tokenType).toBe('P');
      expect(result?.date).toBe('20251208');
      expect(result?.sequence).toBe('0001');
      expect(result?.extension).toBe('input');
    });

    it('should parse WINM file name', () => {
      const result = parseFileName('WINM.P.20251208.0002.input');

      expect(result?.sourceId).toBe('WINM');
      expect(result?.sequence).toBe('0002');
    });

    it('should parse transactional history file', () => {
      const result = parseFileName('TSC.T.20251208.0001.input');

      expect(result?.tokenType).toBe('T');
    });

    it('should parse ID token file', () => {
      const result = parseFileName('V21.I.20251208.0001.input');

      expect(result?.tokenType).toBe('I');
    });

    it('should handle file path', () => {
      const result = parseFileName('billing/input/v21/V21.P.20251208.0001.input');

      expect(result?.sourceId).toBe('V21');
      expect(result?.tokenType).toBe('P');
    });

    it('should return null for invalid format', () => {
      const result = parseFileName('invalid_file.txt');

      expect(result).toBeNull();
    });

    it('should return null for incomplete name', () => {
      const result = parseFileName('V21.P.20251208');

      expect(result).toBeNull();
    });
  });

  describe('generateFileId', () => {
    it('should generate file ID from file name', () => {
      const result = generateFileId('V21.P.20251208.0001.input');

      expect(result).toBe('V21.P.20251208.0001');
    });

    it('should generate fallback ID for invalid name', () => {
      const result = generateFileId('invalid.txt');

      expect(result).toMatch(/^FILE_\d+$/);
    });
  });

  describe('generateBatchId', () => {
    it('should generate batch ID with padding', () => {
      const result = generateBatchId('V21.P.20251208.0001', 1);

      expect(result).toBe('V21.P.20251208.0001.B0001');
    });

    it('should handle large batch numbers', () => {
      const result = generateBatchId('V21.P.20251208.0001', 999);

      expect(result).toBe('V21.P.20251208.0001.B0999');
    });

    it('should handle batch number > 9999', () => {
      const result = generateBatchId('V21.P.20251208.0001', 12345);

      expect(result).toBe('V21.P.20251208.0001.B12345');
    });
  });

  describe('generateOutputFileName', () => {
    it('should generate success output file name', () => {
      const result = generateOutputFileName('V21', 'P', '20251208', '0001', 'output');

      expect(result).toBe('V21.P.20251208.0001.output');
    });

    it('should generate failure output file name', () => {
      const result = generateOutputFileName('WINM', 'P', '20251208', '0002', 'failure');

      expect(result).toBe('WINM.P.20251208.0002.failure');
    });
  });
});
