#!/usr/bin/env node
/**
 * Migration Verification Script
 *
 * Usage:
 *   node scripts/verify-migration.js <FILE_ID or TOKEN_PREFIX>
 *
 * Examples:
 *   node scripts/verify-migration.js FILE_1765420977993
 *   node scripts/verify-migration.js 951              # Token prefix
 *   node scripts/verify-migration.js V21              # Source ID prefix
 *
 * Environment Variables:
 *   SQL_USER, SQL_PASSWORD, SQL_SERVER, SQL_DATABASE
 *   STORAGE_ACCOUNT_NAME, STORAGE_ACCOUNT_KEY (for queue checks)
 */

const sql = require('mssql');
const { execSync } = require('child_process');

// Database config from environment or defaults
const config = {
  user: process.env.SQL_USER || 'sqladmin',
  password: process.env.SQL_PASSWORD || 'DiveDeep@2121',
  server: process.env.SQL_SERVER || 'sql-tokenmigration-dev-oqt29j.database.windows.net',
  database: process.env.SQL_DATABASE || 'sqldb-tokenmigration-dev',
  options: {
    encrypt: true,
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true'
  }
};

async function main() {
  const searchTerm = process.argv[2];

  if (!searchTerm) {
    console.log(`
Migration Verification Script
==============================

Usage:
  node scripts/verify-migration.js <FILE_ID or TOKEN_PREFIX or SOURCE_ID>

Examples:
  node scripts/verify-migration.js FILE_1765420977993   # Search by File ID
  node scripts/verify-migration.js 951                  # Search by token prefix
  node scripts/verify-migration.js V21                  # Search by source
`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  MIGRATION VERIFICATION REPORT`);
  console.log(`  Search Term: ${searchTerm}`);
  console.log(`  Generated: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  const pool = await sql.connect(config);

  try {
    // 1. Find matching batches
    console.log('1. BATCH STATUS');
    console.log('-'.repeat(40));

    const batches = await pool.request()
      .input('term', `%${searchTerm}%`)
      .query(`
        SELECT
          FILE_ID,
          SOURCE_ID,
          STATUS,
          TOTAL_TOKEN_COUNT,
          VALID_TOKEN_COUNT,
          SUCCESS_COUNT,
          FAILURE_COUNT,
          CREATED_AT,
          PROCESS_START_TIME,
          PROCESS_END_TIME
        FROM TOKEN_MIGRATION_BATCH
        WHERE FILE_ID LIKE @term
           OR SOURCE_ID LIKE @term
        ORDER BY CREATED_AT DESC
      `);

    if (batches.recordset.length === 0) {
      console.log('  No batches found matching search term.');
    } else {
      for (const batch of batches.recordset) {
        console.log(`  File ID:       ${batch.FILE_ID}`);
        console.log(`  Source:        ${batch.SOURCE_ID || 'N/A'}`);
        console.log(`  Status:        ${batch.STATUS}`);
        console.log(`  Total Tokens:  ${batch.TOTAL_TOKEN_COUNT}`);
        console.log(`  Valid:         ${batch.VALID_TOKEN_COUNT || 0}`);
        console.log(`  Success:       ${batch.SUCCESS_COUNT || 0}`);
        console.log(`  Failed:        ${batch.FAILURE_COUNT || 0}`);
        console.log(`  Created:       ${batch.CREATED_AT?.toISOString() || 'N/A'}`);
        console.log('');
      }
    }

    // 2. Token validation status distribution
    console.log('\n2. TOKEN VALIDATION STATUS');
    console.log('-'.repeat(40));

    const validationStatus = await pool.request()
      .input('term', `%${searchTerm}%`)
      .query(`
        SELECT VALIDATION_STATUS, COUNT(*) as COUNT
        FROM MONERIS_TOKENS_STAGING
        WHERE FILE_ID LIKE @term
           OR MONERIS_TOKEN LIKE @term
        GROUP BY VALIDATION_STATUS
        ORDER BY COUNT DESC
      `);

    if (validationStatus.recordset.length === 0) {
      console.log('  No tokens found.');
    } else {
      let total = 0;
      for (const row of validationStatus.recordset) {
        console.log(`  ${row.VALIDATION_STATUS || 'NULL'}: ${row.COUNT}`);
        total += row.COUNT;
      }
      console.log(`  ${'─'.repeat(20)}`);
      console.log(`  Total: ${total}`);
    }

    // 3. Token migration status distribution
    console.log('\n3. TOKEN MIGRATION STATUS');
    console.log('-'.repeat(40));

    const migrationStatus = await pool.request()
      .input('term', `%${searchTerm}%`)
      .query(`
        SELECT MIGRATION_STATUS, COUNT(*) as COUNT
        FROM MONERIS_TOKENS_STAGING
        WHERE FILE_ID LIKE @term
           OR MONERIS_TOKEN LIKE @term
        GROUP BY MIGRATION_STATUS
        ORDER BY COUNT DESC
      `);

    if (migrationStatus.recordset.length === 0) {
      console.log('  No tokens found.');
    } else {
      for (const row of migrationStatus.recordset) {
        console.log(`  ${row.MIGRATION_STATUS || 'NULL'}: ${row.COUNT}`);
      }
    }

    // 4. Error breakdown
    console.log('\n4. ERROR BREAKDOWN');
    console.log('-'.repeat(40));

    const errors = await pool.request()
      .input('term', `%${searchTerm}%`)
      .query(`
        SELECT ERROR_CODE, ERROR_MESSAGE, COUNT(*) as COUNT
        FROM MIGRATION_ERROR_DETAILS
        WHERE FILE_ID LIKE @term
           OR MONERIS_TOKEN LIKE @term
        GROUP BY ERROR_CODE, ERROR_MESSAGE
        ORDER BY COUNT DESC
      `);

    if (errors.recordset.length === 0) {
      console.log('  No errors found. ✓');
    } else {
      for (const row of errors.recordset) {
        console.log(`  ${row.ERROR_CODE}: ${row.ERROR_MESSAGE || 'No message'} (${row.COUNT})`);
      }
    }

    // 5. PG Token responses
    console.log('\n5. MASTERCARD (PG) TOKEN RESPONSES');
    console.log('-'.repeat(40));

    const pgTokens = await pool.request()
      .input('term', `%${searchTerm}%`)
      .query(`
        SELECT RESULT, COUNT(*) as COUNT
        FROM PG_TOKENS_STAGING
        WHERE FILE_ID LIKE @term
           OR MONERIS_TOKEN LIKE @term
        GROUP BY RESULT
      `);

    if (pgTokens.recordset.length === 0) {
      console.log('  No PG token responses found.');
    } else {
      for (const row of pgTokens.recordset) {
        console.log(`  ${row.RESULT}: ${row.COUNT}`);
      }
    }

    // 6. Sample tokens
    console.log('\n6. SAMPLE TOKENS (up to 5)');
    console.log('-'.repeat(40));

    const sampleTokens = await pool.request()
      .input('term', `%${searchTerm}%`)
      .query(`
        SELECT TOP 5
          m.MONERIS_TOKEN,
          m.VALIDATION_STATUS,
          m.MIGRATION_STATUS,
          m.PMR,
          p.PG_TOKEN,
          p.CARD_BRAND,
          p.RESULT as MC_RESULT
        FROM MONERIS_TOKENS_STAGING m
        LEFT JOIN PG_TOKENS_STAGING p ON m.MONERIS_TOKEN = p.MONERIS_TOKEN
        WHERE m.FILE_ID LIKE @term
           OR m.MONERIS_TOKEN LIKE @term
        ORDER BY m.CREATED_AT DESC
      `);

    if (sampleTokens.recordset.length === 0) {
      console.log('  No tokens found.');
    } else {
      for (const token of sampleTokens.recordset) {
        console.log(`  Token: ${token.MONERIS_TOKEN}`);
        console.log(`    Validation: ${token.VALIDATION_STATUS}`);
        console.log(`    Migration:  ${token.MIGRATION_STATUS}`);
        console.log(`    PMR:        ${token.PMR || 'Not assigned'}`);
        console.log(`    PG Token:   ${token.PG_TOKEN || 'Not received'}`);
        console.log(`    Card Brand: ${token.CARD_BRAND || 'N/A'}`);
        console.log(`    MC Result:  ${token.MC_RESULT || 'N/A'}`);
        console.log('');
      }
    }

    // 7. Audit trail
    console.log('\n7. AUDIT TRAIL (Recent Activity)');
    console.log('-'.repeat(40));

    const audit = await pool.request()
      .input('term', `%${searchTerm}%`)
      .query(`
        SELECT TOP 10
          MESSAGE_CODE,
          MESSAGE_TEXT,
          CREATED_AT
        FROM TOKEN_MIGRATION_AUDIT_LOG
        WHERE FILE_ID LIKE @term
        ORDER BY CREATED_AT DESC
      `);

    if (audit.recordset.length === 0) {
      console.log('  No audit entries found.');
    } else {
      for (const entry of audit.recordset) {
        const time = entry.CREATED_AT?.toISOString().slice(11, 19) || 'N/A';
        console.log(`  [${time}] ${entry.MESSAGE_CODE}: ${entry.MESSAGE_TEXT?.substring(0, 50) || ''}`);
      }
    }

    // 8. Azure Queue Status
    console.log('\n8. AZURE QUEUE STATUS');
    console.log('-'.repeat(40));

    try {
      const storageAccount = process.env.STORAGE_ACCOUNT_NAME || 'sttokenmigoqt29j';
      const storageKey = process.env.STORAGE_ACCOUNT_KEY ||
        execSync(`az storage account keys list --account-name ${storageAccount} --resource-group rg-tokenmigration-dev --query "[0].value" -o tsv 2>/dev/null`, { encoding: 'utf8' }).trim();

      const queues = [
        'validate-tokens-queue',
        'create-batch-queue',
        'file-gen-queue',
        'batch-manager-queue',
        'batch-worker-queue',
        'billing-file-queue'
      ];

      for (const queue of queues) {
        try {
          const result = execSync(
            `az storage message peek --queue-name "${queue}" --account-name ${storageAccount} --account-key "${storageKey}" --num-messages 32 2>/dev/null`,
            { encoding: 'utf8' }
          );
          const messages = JSON.parse(result || '[]');
          const icon = messages.length > 0 ? '⏳' : '✓';
          console.log(`  ${icon} ${queue}: ${messages.length} pending`);
        } catch {
          console.log(`  ? ${queue}: Unable to check`);
        }
      }
    } catch (err) {
      console.log('  Unable to check queues (az CLI not available or not logged in)');
    }

    // 9. Summary
    console.log('\n' + '='.repeat(60));
    console.log('  VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    const summary = await pool.request()
      .input('term', `%${searchTerm}%`)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM TOKEN_MIGRATION_BATCH WHERE FILE_ID LIKE @term OR SOURCE_ID LIKE @term) as batch_count,
          (SELECT COUNT(*) FROM MONERIS_TOKENS_STAGING WHERE FILE_ID LIKE @term OR MONERIS_TOKEN LIKE @term) as total_tokens,
          (SELECT COUNT(*) FROM MONERIS_TOKENS_STAGING WHERE (FILE_ID LIKE @term OR MONERIS_TOKEN LIKE @term) AND VALIDATION_STATUS = 'VALID') as valid_tokens,
          (SELECT COUNT(*) FROM MONERIS_TOKENS_STAGING WHERE (FILE_ID LIKE @term OR MONERIS_TOKEN LIKE @term) AND MIGRATION_STATUS = 'COMPLETED') as migrated_tokens,
          (SELECT COUNT(*) FROM MONERIS_TOKENS_STAGING WHERE (FILE_ID LIKE @term OR MONERIS_TOKEN LIKE @term) AND MIGRATION_STATUS = 'FAILED') as failed_tokens,
          (SELECT COUNT(*) FROM PG_TOKENS_STAGING WHERE FILE_ID LIKE @term OR MONERIS_TOKEN LIKE @term) as pg_tokens,
          (SELECT COUNT(*) FROM MIGRATION_ERROR_DETAILS WHERE FILE_ID LIKE @term OR MONERIS_TOKEN LIKE @term) as error_count
      `);

    const s = summary.recordset[0];
    console.log(`  Batches Found:      ${s.batch_count}`);
    console.log(`  Total Tokens:       ${s.total_tokens}`);
    console.log(`  Valid Tokens:       ${s.valid_tokens}`);
    console.log(`  Migrated (Success): ${s.migrated_tokens}`);
    console.log(`  Failed:             ${s.failed_tokens}`);
    console.log(`  PG Responses:       ${s.pg_tokens}`);
    console.log(`  Errors Logged:      ${s.error_count}`);

    // Calculate completion percentage
    if (s.total_tokens > 0) {
      const completionPct = ((s.migrated_tokens + s.failed_tokens) / s.total_tokens * 100).toFixed(1);
      const successPct = s.migrated_tokens > 0 ? (s.migrated_tokens / (s.migrated_tokens + s.failed_tokens) * 100).toFixed(1) : 0;
      console.log(`\n  Completion Rate:    ${completionPct}%`);
      console.log(`  Success Rate:       ${successPct}%`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } finally {
    await pool.close();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
