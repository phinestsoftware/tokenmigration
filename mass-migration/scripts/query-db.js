#!/usr/bin/env node
/**
 * Database Query Script for Token Migration
 *
 * Usage:
 *   node scripts/query-db.js <query-name> [parameters...]
 *
 * Examples:
 *   node scripts/query-db.js tokens FILE_1768361493694
 *   node scripts/query-db.js status FILE_1768361493694
 *   node scripts/query-db.js errors FILE_1768361493694
 *   node scripts/query-db.js audit FILE_1768361493694
 *   node scripts/query-db.js duplicates FILE_1768361493694
 *   node scripts/query-db.js pmr-mapping 9518050018246830
 *   node scripts/query-db.js custom "SELECT TOP 10 * FROM MONERIS_TOKENS_STAGING"
 */

const sql = require('mssql');

const config = {
  user: 'tokenmigadmin',
  password: 'hcRGQv6bzHzWVfsBWRsFZ69U',
  server: 'sql-tokenmigration-dev-941olb.database.windows.net',
  database: 'sqldb-tokenmigration-dev',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

const queries = {
  // Get tokens for a file
  tokens: (fileId) => `
    SELECT TOP 20
      ID, MONERIS_TOKEN, VALIDATION_STATUS, MIGRATION_STATUS, ERROR_CODE, PMR
    FROM MONERIS_TOKENS_STAGING
    WHERE FILE_ID = '${fileId}'
    ORDER BY ID
  `,

  // Get status summary for a file
  status: (fileId) => `
    SELECT VALIDATION_STATUS, MIGRATION_STATUS, COUNT(*) as Count
    FROM MONERIS_TOKENS_STAGING
    WHERE FILE_ID = '${fileId}'
    GROUP BY VALIDATION_STATUS, MIGRATION_STATUS
    ORDER BY VALIDATION_STATUS, MIGRATION_STATUS
  `,

  // Get errors for a file
  errors: (fileId) => `
    SELECT
      MONERIS_TOKEN, ERROR_CODE, ERROR_MESSAGE, ERROR_TYPE, CREATED_AT
    FROM MIGRATION_ERROR_DETAILS
    WHERE FILE_ID = '${fileId}'
    ORDER BY CREATED_AT DESC
  `,

  // Get audit log for a file
  audit: (fileId) => `
    SELECT
      MESSAGE_CODE, MESSAGE_TEXT, ADDITIONAL_INFO, CREATED_AT
    FROM TOKEN_MIGRATION_AUDIT_LOG
    WHERE FILE_ID = '${fileId}'
    ORDER BY CREATED_AT ASC
  `,

  // Get duplicate tokens for a file
  duplicates: (fileId) => `
    SELECT
      ID, MONERIS_TOKEN, VALIDATION_STATUS, MIGRATION_STATUS, ERROR_CODE, PMR
    FROM MONERIS_TOKENS_STAGING
    WHERE FILE_ID = '${fileId}'
      AND (VALIDATION_STATUS = 'DUPLICATE' OR ERROR_CODE LIKE '%DUPLICATE%')
    ORDER BY ID
  `,

  // Check PMR_MONERIS_MAPPING for a token
  'pmr-mapping': (monerisToken) => `
    SELECT TOP 10 *
    FROM PMR_MONERIS_MAPPING
    WHERE MONERIS_TOKEN = '${monerisToken}'
  `,

  // Get batch info for a file
  batch: (fileId) => `
    SELECT
      BATCH_ID, FILE_ID, FILE_NAME, SOURCE_ID, STATUS,
      TOTAL_TOKEN_COUNT, VALID_TOKEN_COUNT, SUCCESS_COUNT, FAILURE_COUNT,
      CREATED_AT, UPDATED_AT
    FROM TOKEN_MIGRATION_BATCH
    WHERE FILE_ID = '${fileId}' OR BATCH_ID LIKE '${fileId}%'
    ORDER BY CREATED_AT DESC
  `,

  // Get PG tokens for a file
  'pg-tokens': (fileId) => `
    SELECT TOP 20
      MONERIS_TOKEN, PG_TOKEN, RESULT, ERROR_CAUSE, ERROR_EXPLANATION,
      CC_CARD_BRAND, MIGRATION_STATUS
    FROM PG_TOKENS_STAGING
    WHERE FILE_ID = '${fileId}'
    ORDER BY ID
  `,

  // Recent batches
  'recent-batches': () => `
    SELECT TOP 20
      BATCH_ID, FILE_ID, FILE_NAME, SOURCE_ID, STATUS,
      TOTAL_TOKEN_COUNT, SUCCESS_COUNT, FAILURE_COUNT, CREATED_AT
    FROM TOKEN_MIGRATION_BATCH
    ORDER BY CREATED_AT DESC
  `,

  // Custom query
  custom: (query) => query
};

async function runQuery(queryName, param) {
  let pool;
  try {
    console.log(`Connecting to database...`);
    pool = await sql.connect(config);
    console.log(`Connected. Running query: ${queryName}\n`);

    const queryFn = queries[queryName];
    if (!queryFn) {
      console.error(`Unknown query: ${queryName}`);
      console.log('\nAvailable queries:');
      Object.keys(queries).forEach(q => console.log(`  - ${q}`));
      process.exit(1);
    }

    const queryStr = queryFn(param);
    console.log(`Query: ${queryStr.trim().substring(0, 200)}...\n`);

    const result = await pool.request().query(queryStr);

    if (result.recordset.length === 0) {
      console.log('No results found.');
    } else {
      console.log(`Results (${result.recordset.length} rows):\n`);
      console.table(result.recordset);

      // Also print as JSON for easier parsing
      console.log('\nJSON output:');
      console.log(JSON.stringify(result.recordset, null, 2));
    }

  } catch (err) {
    console.error('Error:', err.message);
    if (err.code) console.error('Code:', err.code);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node scripts/query-db.js <query-name> [parameter]');
  console.log('\nAvailable queries:');
  Object.keys(queries).forEach(q => console.log(`  - ${q}`));
  console.log('\nExamples:');
  console.log('  node scripts/query-db.js tokens FILE_1768361493694');
  console.log('  node scripts/query-db.js status FILE_1768361493694');
  console.log('  node scripts/query-db.js errors FILE_1768361493694');
  console.log('  node scripts/query-db.js duplicates FILE_1768361493694');
  console.log('  node scripts/query-db.js recent-batches');
  console.log('  node scripts/query-db.js custom "SELECT TOP 10 * FROM MONERIS_TOKENS_STAGING"');
  process.exit(0);
}

const queryName = args[0];
const param = args.slice(1).join(' ');

runQuery(queryName, param);
