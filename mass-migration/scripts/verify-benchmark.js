#!/usr/bin/env node
/**
 * Benchmark Verification Script
 *
 * Usage:
 *   node scripts/verify-benchmark.js [fileId]
 *   node scripts/verify-benchmark.js              # Auto-detect latest benchmark file
 *   node scripts/verify-benchmark.js FILE_123456  # Specific file
 */

const sql = require('mssql');

const CONFIG = {
  server: 'sql-tokenmigration-dev-941olb.database.windows.net',
  database: 'sqldb-tokenmigration-dev',
  user: 'tokenmigadmin',
  password: 'hcRGQv6bzHzWVfsBWRsFZ69U',
  options: { encrypt: true, trustServerCertificate: false },
  requestTimeout: 60000
};

async function verify(fileId) {
  const pool = await sql.connect(CONFIG);

  // If no fileId provided, find the latest benchmark file
  if (!fileId) {
    const latest = await pool.request().query(`
      SELECT TOP 1 FILE_ID, COUNT(*) as TOKEN_COUNT
      FROM MONERIS_TOKENS_STAGING
      WHERE FILE_ID LIKE 'FILE_%'
      GROUP BY FILE_ID
      ORDER BY MIN(CREATED_AT) DESC
    `);

    if (latest.recordset.length === 0) {
      console.log('No benchmark files found.');
      await pool.close();
      return;
    }

    fileId = latest.recordset[0].FILE_ID;
    console.log(`Auto-detected latest benchmark: ${fileId} (${latest.recordset[0].TOKEN_COUNT.toLocaleString()} tokens)\n`);
  }

  // Header
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                    BENCHMARK VERIFICATION REPORT                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`\nFile ID: ${fileId}`);
  console.log(`Generated: ${new Date().toISOString()}`);

  // Token Summary
  const tokens = await pool.request().input('fileId', sql.VarChar, fileId).query(`
    SELECT
      COUNT(*) as TOTAL,
      SUM(CASE WHEN VALIDATION_STATUS = 'VALID' THEN 1 ELSE 0 END) as VALID,
      SUM(CASE WHEN VALIDATION_STATUS = 'INVALID' THEN 1 ELSE 0 END) as INVALID,
      SUM(CASE WHEN VALIDATION_STATUS = 'PENDING' THEN 1 ELSE 0 END) as VALID_PENDING,
      SUM(CASE WHEN MIGRATION_STATUS = 'COMPLETED' THEN 1 ELSE 0 END) as COMPLETED,
      SUM(CASE WHEN MIGRATION_STATUS = 'PENDING' THEN 1 ELSE 0 END) as MIG_PENDING,
      SUM(CASE WHEN MIGRATION_STATUS = 'FAILED' THEN 1 ELSE 0 END) as FAILED,
      MIN(CREATED_AT) as FIRST_LOAD,
      MAX(UPDATED_AT) as LAST_UPDATE
    FROM MONERIS_TOKENS_STAGING WHERE FILE_ID = @fileId
  `);

  const t = tokens.recordset[0];
  const completionPct = t.TOTAL > 0 ? (t.COMPLETED / t.TOTAL * 100).toFixed(1) : 0;

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ TOKEN SUMMARY                                                       │');
  console.log('├─────────────────────────┬───────────────────────────────────────────┤');
  console.log(`│ Total Tokens            │ ${t.TOTAL.toLocaleString().padStart(39)} │`);
  console.log(`│ Valid                   │ ${t.VALID.toLocaleString().padStart(39)} │`);
  console.log(`│ Invalid                 │ ${t.INVALID.toLocaleString().padStart(39)} │`);
  console.log(`│ Validation Pending      │ ${t.VALID_PENDING.toLocaleString().padStart(39)} │`);
  console.log('├─────────────────────────┼───────────────────────────────────────────┤');
  console.log(`│ Completed               │ ${(t.COMPLETED.toLocaleString() + ' (' + completionPct + '%)').padStart(39)} │`);
  console.log(`│ Migration Pending       │ ${t.MIG_PENDING.toLocaleString().padStart(39)} │`);
  console.log(`│ Failed                  │ ${t.FAILED.toLocaleString().padStart(39)} │`);
  console.log('└─────────────────────────┴───────────────────────────────────────────┘');

  // Batch Summary
  const batches = await pool.request().input('fileId', sql.VarChar, fileId).query(`
    SELECT
      COUNT(*) as TOTAL_BATCHES,
      SUM(CASE WHEN STATUS = 'COMPLETED' THEN 1 ELSE 0 END) as COMPLETED_BATCHES,
      SUM(CASE WHEN STATUS = 'PROCESSING' THEN 1 ELSE 0 END) as PROCESSING_BATCHES,
      SUM(CASE WHEN STATUS = 'PENDING' THEN 1 ELSE 0 END) as PENDING_BATCHES,
      SUM(CASE WHEN STATUS = 'FAILED' THEN 1 ELSE 0 END) as FAILED_BATCHES,
      MAX(BATCH_SIZE) as BATCH_SIZE,
      SUM(SUCCESS_COUNT) as TOTAL_SUCCESS,
      SUM(FAILURE_COUNT) as TOTAL_FAILURE,
      MIN(PROCESS_START_TIME) as FIRST_START,
      MAX(PROCESS_END_TIME) as LAST_END
    FROM TOKEN_MIGRATION_BATCH WHERE FILE_ID = @fileId
  `);

  const b = batches.recordset[0];
  const batchDuration = b.FIRST_START && b.LAST_END ?
    ((new Date(b.LAST_END) - new Date(b.FIRST_START)) / 1000).toFixed(1) : 'N/A';

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ BATCH SUMMARY                                                       │');
  console.log('├─────────────────────────┬───────────────────────────────────────────┤');
  console.log(`│ Total Batches           │ ${(b.TOTAL_BATCHES || 0).toString().padStart(39)} │`);
  console.log(`│ Batch Size              │ ${(b.BATCH_SIZE || 0).toLocaleString().padStart(39)} │`);
  console.log(`│ Completed               │ ${(b.COMPLETED_BATCHES || 0).toString().padStart(39)} │`);
  console.log(`│ Processing              │ ${(b.PROCESSING_BATCHES || 0).toString().padStart(39)} │`);
  console.log(`│ Pending                 │ ${(b.PENDING_BATCHES || 0).toString().padStart(39)} │`);
  console.log(`│ Failed                  │ ${(b.FAILED_BATCHES || 0).toString().padStart(39)} │`);
  console.log('├─────────────────────────┼───────────────────────────────────────────┤');
  console.log(`│ Success Records         │ ${(b.TOTAL_SUCCESS || 0).toLocaleString().padStart(39)} │`);
  console.log(`│ Failure Records         │ ${(b.TOTAL_FAILURE || 0).toLocaleString().padStart(39)} │`);
  console.log(`│ Batch Duration (wall)   │ ${(batchDuration + ' sec').padStart(39)} │`);
  console.log('└─────────────────────────┴───────────────────────────────────────────┘');

  // PG Tokens
  const pg = await pool.request().input('fileId', sql.VarChar, fileId).query(`
    SELECT
      COUNT(*) as TOTAL,
      MIN(CREATED_AT) as FIRST,
      MAX(CREATED_AT) as LAST
    FROM PG_TOKENS_STAGING WHERE FILE_ID = @fileId
  `);

  const pgDuration = pg.recordset[0].FIRST && pg.recordset[0].LAST ?
    ((new Date(pg.recordset[0].LAST) - new Date(pg.recordset[0].FIRST)) / 1000).toFixed(1) : 'N/A';

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ PG TOKENS                                                           │');
  console.log('├─────────────────────────┬───────────────────────────────────────────┤');
  console.log(`│ Total Generated         │ ${pg.recordset[0].TOTAL.toLocaleString().padStart(39)} │`);
  console.log(`│ Load Duration           │ ${(pgDuration + ' sec').padStart(39)} │`);
  console.log('└─────────────────────────┴───────────────────────────────────────────┘');

  // Timing
  const totalDuration = t.FIRST_LOAD && b.LAST_END ?
    ((new Date(b.LAST_END) - new Date(t.FIRST_LOAD)) / 1000) : 0;

  const loadDuration = t.FIRST_LOAD && t.LAST_UPDATE && !b.FIRST_START ?
    ((new Date(t.LAST_UPDATE) - new Date(t.FIRST_LOAD)) / 1000) : 0;

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ TIMING                                                              │');
  console.log('├─────────────────────────┬───────────────────────────────────────────┤');
  console.log(`│ First Load              │ ${(t.FIRST_LOAD ? t.FIRST_LOAD.toISOString() : 'N/A').padStart(39)} │`);
  console.log(`│ Last Update             │ ${(t.LAST_UPDATE ? t.LAST_UPDATE.toISOString() : 'N/A').padStart(39)} │`);
  console.log(`│ Batch Start             │ ${(b.FIRST_START ? b.FIRST_START.toISOString() : 'N/A').padStart(39)} │`);
  console.log(`│ Batch End               │ ${(b.LAST_END ? b.LAST_END.toISOString() : 'N/A').padStart(39)} │`);
  console.log('├─────────────────────────┼───────────────────────────────────────────┤');
  console.log(`│ Batch Processing        │ ${(batchDuration + ' sec').padStart(39)} │`);
  console.log(`│ Total (Load → Complete) │ ${(totalDuration.toFixed(1) + ' sec (' + (totalDuration/60).toFixed(1) + ' min)').padStart(39)} │`);
  console.log('└─────────────────────────┴───────────────────────────────────────────┘');

  // Throughput
  const batchThroughput = batchDuration !== 'N/A' && parseFloat(batchDuration) > 0 ?
    ((b.TOTAL_SUCCESS || 0) / parseFloat(batchDuration)).toFixed(0) : 'N/A';
  const overallThroughput = totalDuration > 0 ?
    (t.TOTAL / totalDuration).toFixed(0) : 'N/A';

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ THROUGHPUT                                                          │');
  console.log('├─────────────────────────┬───────────────────────────────────────────┤');
  console.log(`│ Batch Processing        │ ${(batchThroughput + ' records/sec').padStart(39)} │`);
  console.log(`│ Overall                 │ ${(overallThroughput + ' tokens/sec').padStart(39)} │`);
  console.log('└─────────────────────────┴───────────────────────────────────────────┘');

  // Batch Details (top 10 slowest)
  const batchDetails = await pool.request().input('fileId', sql.VarChar, fileId).query(`
    SELECT TOP 10
      BATCH_NUMBER,
      STATUS,
      TOTAL_TOKEN_COUNT,
      SUCCESS_COUNT,
      FAILURE_COUNT,
      DATEDIFF(MILLISECOND, PROCESS_START_TIME, PROCESS_END_TIME) as DURATION_MS
    FROM TOKEN_MIGRATION_BATCH
    WHERE FILE_ID = @fileId AND PROCESS_START_TIME IS NOT NULL
    ORDER BY DATEDIFF(MILLISECOND, PROCESS_START_TIME, PROCESS_END_TIME) DESC
  `);

  if (batchDetails.recordset.length > 0) {
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ SLOWEST BATCHES (Top 10)                                            │');
    console.log('├─────────┬──────────┬─────────┬─────────┬──────────────────────────────┤');
    console.log('│ Batch # │ Status   │ Success │ Failed  │ Duration                     │');
    console.log('├─────────┼──────────┼─────────┼─────────┼──────────────────────────────┤');
    batchDetails.recordset.forEach(r => {
      const dur = r.DURATION_MS ? (r.DURATION_MS / 1000).toFixed(1) + ' sec' : 'N/A';
      const batchNum = r.BATCH_NUMBER !== null ? r.BATCH_NUMBER.toString() : 'N/A';
      console.log(`│ ${batchNum.padStart(7)} │ ${r.STATUS.padEnd(8)} │ ${r.SUCCESS_COUNT.toString().padStart(7)} │ ${r.FAILURE_COUNT.toString().padStart(7)} │ ${dur.padStart(28)} │`);
    });
    console.log('└─────────┴──────────┴─────────┴─────────┴──────────────────────────────┘');
  }

  // Status indicator
  console.log('\n');
  if (t.VALID_PENDING > 0) {
    console.log('⏳ STATUS: Validation in progress...');
  } else if (b.PROCESSING_BATCHES > 0 || b.PENDING_BATCHES > 0) {
    console.log('⏳ STATUS: Batch processing in progress...');
  } else if (t.COMPLETED === t.VALID) {
    console.log('✅ STATUS: Migration COMPLETE');
  } else {
    console.log('⚠️  STATUS: Migration complete with some failures');
  }

  // 8M projection
  if (t.TOTAL > 0 && totalDuration > 0) {
    const projection8M = (totalDuration / t.TOTAL) * 8000000;
    console.log(`\n📊 8M PROJECTION: ~${(projection8M / 3600).toFixed(1)} hours (based on ${(totalDuration / t.TOTAL * 1000).toFixed(2)} ms/token)`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════\n');

  await pool.close();
}

// Main
const fileId = process.argv[2];
verify(fileId).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
