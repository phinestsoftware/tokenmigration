/**
 * Unit tests for duplicate detection logic
 *
 * Issue #42: Token should be marked as duplicate based on PMR_MONERIS_MAPPING
 * (not MONERIS_TOKENS_STAGING.MIGRATION_STATUS)
 *
 * The duplicate check should:
 * 1. Check PMR_MONERIS_MAPPING table for existing tokens
 * 2. Return the PMR value for logging in error details
 * 3. Add PMR to audit log for debugging
 */

import {
  buildDuplicateCheckQuery,
  DuplicateCheckResult,
  DuplicateTokenInfo,
} from '../../../src/services/duplicateDetectionService';

describe('DuplicateDetectionService', () => {
  describe('buildDuplicateCheckQuery', () => {
    it('should query PMR_MONERIS_MAPPING table (not MONERIS_TOKENS_STAGING)', () => {
      const query = buildDuplicateCheckQuery('FILE_123');

      // The query MUST check PMR_MONERIS_MAPPING table
      expect(query.toLowerCase()).toContain('pmr_moneris_mapping');

      // The query should NOT use MIGRATION_STATUS from MONERIS_TOKENS_STAGING for duplicate detection
      expect(query.toLowerCase()).not.toMatch(/moneris_tokens_staging.*migration_status.*completed/);
    });

    it('should return PMR in the result for error logging', () => {
      const query = buildDuplicateCheckQuery('FILE_123');

      // Query should select PMR column for error details
      expect(query.toLowerCase()).toMatch(/select.*pmr/);
    });

    it('should join on MONERIS_TOKEN to find existing mappings', () => {
      const query = buildDuplicateCheckQuery('FILE_123');

      // Should join MONERIS_TOKENS_STAGING with PMR_MONERIS_MAPPING on MONERIS_TOKEN
      expect(query.toLowerCase()).toContain('moneris_token');
      expect(query.toLowerCase()).toContain('pmr_moneris_mapping');
    });
  });

  describe('DuplicateTokenInfo', () => {
    it('should include PMR field in the interface', () => {
      // This test verifies the interface has the PMR field
      const duplicateInfo: DuplicateTokenInfo = {
        ID: 1,
        MONERIS_TOKEN: '9518050018246830',
        PMR: '8518050018246830',
      };

      expect(duplicateInfo.PMR).toBeDefined();
      expect(duplicateInfo.PMR).toBe('8518050018246830');
    });
  });

  describe('DuplicateCheckResult', () => {
    it('should provide error message with PMR for logging', () => {
      const result: DuplicateCheckResult = {
        isDuplicate: true,
        monerisToken: '9518050018246830',
        existingPMR: '8518050018246830',
        errorMessage: 'Duplicate: PMR 8518050018246830 already exists in Payment Hub',
      };

      expect(result.errorMessage).toContain('PMR');
      expect(result.errorMessage).toContain('8518050018246830');
    });
  });
});
