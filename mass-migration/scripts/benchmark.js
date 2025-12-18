#!/usr/bin/env node
/**
 * Benchmark Script for Token Migration Performance Testing
 *
 * Usage:
 *   node scripts/benchmark.js [tokenCount] [--upload-only] [--skip-cleanup]
 *
 * Examples:
 *   node scripts/benchmark.js 1000      # Test with 1K tokens
 *   node scripts/benchmark.js 10000     # Test with 10K tokens
 *   node scripts/benchmark.js 100000    # Test with 100K tokens
 *   node scripts/benchmark.js 8000000   # Test with 8M tokens (full scale)
 *   node scripts/benchmark.js 10000 --upload-only  # Only test upload/insert phase
 */

const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  sql: {
    server: 'sql-tokenmigration-dev-oqt29j.database.windows.net',
    database: 'sqldb-tokenmigration-dev',
    user: 'sqladmin',
    password: 'DiveDeep@2121',
    options: { encrypt: true, trustServerCertificate: false },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  },
  storage: {
    accountName: 'sttokenmigoqt29j',
    containerName: 'billing-input'
  },
  functionApp: 'func-tokenmigration-dev-oqt29j',
  resourceGroup: 'rg-tokenmigration-dev'
};

// Timing utilities
class Timer {
  constructor(name) {
    this.name = name;
    this.start = Date.now();
  }

  elapsed() {
    return Date.now() - this.start;
  }

  elapsedStr() {
    const ms = this.elapsed();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms/1000).toFixed(1)}s`;
    return `${(ms/60000).toFixed(1)}min`;
  }

  log(message) {
    console.log(`[${this.elapsedStr()}] ${message}`);
  }
}

// Generate test CSV content
// Token format: 9XXX + 12 digit counter = 16 chars total (VARCHAR(16) limit)
// Supports up to 999,999,999,999 (999 billion) unique tokens per prefix
function generateTestCsv(tokenCount, prefix) {
  const header = 'MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT';
  const lines = [header];

  const expDates = ['0125', '0626', '1227', '0328', '0929'];
  const entityTypes = ['1', '2'];

  // Use 3-digit prefix to keep token at 16 chars: 9 + XXX + 12-digit counter
  const shortPrefix = prefix.slice(-3);

  for (let i = 0; i < tokenCount; i++) {
    // Format: 9XXX + 12-digit padded counter = 16 chars
    const token = `9${shortPrefix}${String(i).padStart(12, '0')}`;
    const expDate = expDates[i % expDates.length];
    const entityId = `E${String(i % 100000).padStart(5, '0')}`;
    const entityType = entityTypes[i % entityTypes.length];
    const creationDate = '20240115';
    const lastUseDate = '20241201';

    lines.push(`${token},${expDate},${entityId},${entityType},O,${creationDate},${lastUseDate},,`);
  }

  return lines.join('\n');
}

// Get storage connection string from Function App
async function getStorageConnectionString() {
  const { execSync } = require('child_process');
  const result = execSync(
    `az functionapp config appsettings list --name ${CONFIG.functionApp} --resource-group ${CONFIG.resourceGroup} --query "[?name=='AzureWebJobsStorage'].value" -o tsv`,
    { encoding: 'utf-8' }
  ).trim();
  return result;
}

// Upload file to blob storage
async function uploadTestFile(connectionString, content, fileName) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(CONFIG.storage.containerName);
  const blobPath = `V21/${fileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

  await blockBlobClient.upload(content, content.length, {
    blobHTTPHeaders: { blobContentType: 'text/csv' }
  });

  return blobPath;
}

// Database operations
async function getPool() {
  return sql.connect(CONFIG.sql);
}

async function cleanupTestData(pool, prefix) {
  const shortPrefix = prefix.slice(-3);
  const tokenPattern = `9${shortPrefix}%`;

  // Find file IDs for cleanup
  const fileResult = await pool.request()
    .input('pattern', tokenPattern)
    .query(`SELECT DISTINCT FILE_ID FROM MONERIS_TOKENS_STAGING WHERE MONERIS_TOKEN LIKE @pattern`);

  const fileIds = fileResult.recordset.map(r => r.FILE_ID);

  if (fileIds.length > 0) {
    for (const fileId of fileIds) {
      await pool.request().input('fileId', fileId).query(`DELETE FROM MIGRATION_ERROR_DETAILS WHERE FILE_ID = @fileId`);
      await pool.request().input('fileId', fileId).query(`DELETE FROM TOKEN_MIGRATION_AUDIT_LOG WHERE FILE_ID = @fileId`);
      await pool.request().input('fileId', fileId).query(`DELETE FROM TOKEN_MIGRATION_WORKERS WHERE FILE_ID = @fileId`);
      await pool.request().input('fileId', fileId).query(`DELETE FROM PG_TOKENS_STAGING WHERE FILE_ID = @fileId`);
      await pool.request().input('fileId', fileId).query(`DELETE FROM MONERIS_TOKENS_STAGING WHERE FILE_ID = @fileId`);
      await pool.request().input('fileId', fileId).query(`DELETE FROM TOKEN_MIGRATION_BATCH WHERE FILE_ID = @fileId`);
    }
  }

  return fileIds.length;
}

async function getTokenStats(pool, prefix) {
  const shortPrefix = prefix.slice(-3);
  const tokenPattern = `9${shortPrefix}%`;

  const result = await pool.request()
    .input('pattern', tokenPattern)
    .query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN VALIDATION_STATUS = 'VALID' THEN 1 ELSE 0 END) as valid,
        SUM(CASE WHEN VALIDATION_STATUS = 'INVALID' THEN 1 ELSE 0 END) as invalid,
        SUM(CASE WHEN VALIDATION_STATUS = 'PENDING' THEN 1 ELSE 0 END) as validationPending,
        SUM(CASE WHEN MIGRATION_STATUS = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN MIGRATION_STATUS = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN MIGRATION_STATUS = 'PENDING' THEN 1 ELSE 0 END) as migrationPending
      FROM MONERIS_TOKENS_STAGING
      WHERE MONERIS_TOKEN LIKE @pattern
    `);

  return result.recordset[0];
}

async function getPgTokenCount(pool, prefix) {
  const shortPrefix = prefix.slice(-3);
  const tokenPattern = `9${shortPrefix}%`;

  const result = await pool.request()
    .input('pattern', tokenPattern)
    .query(`
      SELECT COUNT(*) as count
      FROM PG_TOKENS_STAGING
      WHERE MONERIS_TOKEN LIKE @pattern
    `);

  return result.recordset[0].count;
}

// Wait for processing to complete
async function waitForProcessing(pool, prefix, tokenCount, timer, timeout = 3600000) {
  const startWait = Date.now();
  let lastStatus = '';

  while (Date.now() - startWait < timeout) {
    const stats = await getTokenStats(pool, prefix);
    const pgCount = await getPgTokenCount(pool, prefix);

    const status = `Loaded: ${stats.total}/${tokenCount} | Valid: ${stats.valid} | Completed: ${stats.completed} | PG: ${pgCount}`;

    if (status !== lastStatus) {
      timer.log(status);
      lastStatus = status;
    }

    // Check if processing is complete
    if (stats.total === tokenCount && stats.validationPending === 0 && stats.migrationPending === 0) {
      return stats;
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Timeout waiting for processing to complete');
}

// Main benchmark function
async function runBenchmark(tokenCount, options = {}) {
  const prefix = String(Date.now()).slice(-6);
  const timer = new Timer('Benchmark');
  const results = {
    tokenCount,
    prefix,
    timestamps: {},
    durations: {},
    stats: {}
  };

  console.log('\n' + '='.repeat(60));
  console.log(`  BENCHMARK: ${tokenCount.toLocaleString()} TOKENS`);
  console.log(`  Prefix: ${prefix}`);
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60) + '\n');

  let pool;

  try {
    // Connect to database
    timer.log('Connecting to database...');
    pool = await getPool();
    results.timestamps.dbConnected = Date.now();

    // Cleanup previous test data
    if (!options.skipCleanup) {
      timer.log('Cleaning up previous test data...');
      const cleaned = await cleanupTestData(pool, prefix);
      timer.log(`Cleaned ${cleaned} previous file(s)`);
    }
    results.timestamps.cleanupDone = Date.now();

    // Generate test file
    timer.log(`Generating ${tokenCount.toLocaleString()} tokens...`);
    const csvContent = generateTestCsv(tokenCount, prefix);
    const fileSizeMB = (Buffer.byteLength(csvContent) / 1024 / 1024).toFixed(2);
    timer.log(`Generated CSV: ${fileSizeMB} MB`);
    results.timestamps.fileGenerated = Date.now();
    results.stats.fileSizeMB = parseFloat(fileSizeMB);

    // Get storage connection string
    timer.log('Getting storage connection string...');
    const connectionString = await getStorageConnectionString();
    results.timestamps.connectionStringObtained = Date.now();

    // Upload file
    const fileName = `V21_BENCHMARK_${prefix}.csv`;
    timer.log(`Uploading ${fileName}...`);
    const blobPath = await uploadTestFile(connectionString, csvContent, fileName);
    timer.log(`Uploaded to: ${blobPath}`);
    results.timestamps.fileUploaded = Date.now();

    if (options.uploadOnly) {
      timer.log('Upload-only mode - skipping processing wait');
    } else {
      // Wait for initial load
      timer.log('Waiting for blob trigger and initial load...');
      let stats = await getTokenStats(pool, prefix);
      while (stats.total < tokenCount) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        stats = await getTokenStats(pool, prefix);
        if (stats.total > 0 && stats.total !== results.stats.lastLoaded) {
          timer.log(`Loading: ${stats.total.toLocaleString()}/${tokenCount.toLocaleString()} tokens`);
          results.stats.lastLoaded = stats.total;
        }
      }
      results.timestamps.tokensLoaded = Date.now();
      timer.log(`All ${tokenCount.toLocaleString()} tokens loaded`);

      // Wait for validation
      timer.log('Waiting for validation...');
      while (stats.validationPending > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        stats = await getTokenStats(pool, prefix);
        timer.log(`Validation: ${stats.valid} valid, ${stats.invalid} invalid, ${stats.validationPending} pending`);
      }
      results.timestamps.validationDone = Date.now();

      // Wait for migration
      timer.log('Waiting for migration...');
      const finalStats = await waitForProcessing(pool, prefix, tokenCount, timer);
      results.timestamps.migrationDone = Date.now();
      results.stats.final = finalStats;
    }

    // Calculate durations
    const ts = results.timestamps;
    results.durations = {
      fileGeneration: ts.fileGenerated - ts.cleanupDone,
      upload: ts.fileUploaded - ts.fileGenerated,
      loading: ts.tokensLoaded ? ts.tokensLoaded - ts.fileUploaded : null,
      validation: ts.validationDone ? ts.validationDone - ts.tokensLoaded : null,
      migration: ts.migrationDone ? ts.migrationDone - ts.validationDone : null,
      total: (ts.migrationDone || ts.fileUploaded) - ts.cleanupDone
    };

  } catch (error) {
    timer.log(`ERROR: ${error.message}`);
    results.error = error.message;
  } finally {
    if (pool) {
      await pool.close();
    }
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('  BENCHMARK RESULTS');
  console.log('='.repeat(60));
  console.log(`  Token Count:     ${tokenCount.toLocaleString()}`);
  console.log(`  File Size:       ${results.stats.fileSizeMB} MB`);
  console.log('');
  console.log('  Phase Durations:');
  console.log(`    File Generation: ${formatDuration(results.durations.fileGeneration)}`);
  console.log(`    Upload:          ${formatDuration(results.durations.upload)}`);
  if (results.durations.loading) {
    console.log(`    Loading:         ${formatDuration(results.durations.loading)}`);
    console.log(`    Validation:      ${formatDuration(results.durations.validation)}`);
    console.log(`    Migration:       ${formatDuration(results.durations.migration)}`);
  }
  console.log(`    ─────────────────────────`);
  console.log(`    TOTAL:           ${formatDuration(results.durations.total)}`);
  console.log('');
  if (results.stats.final) {
    console.log('  Final Stats:');
    console.log(`    Valid:     ${results.stats.final.valid}`);
    console.log(`    Invalid:   ${results.stats.final.invalid}`);
    console.log(`    Completed: ${results.stats.final.completed}`);
    console.log(`    Failed:    ${results.stats.final.failed}`);
  }
  console.log('');
  console.log(`  Throughput: ${(tokenCount / (results.durations.total / 1000)).toFixed(0)} tokens/sec`);
  console.log('='.repeat(60) + '\n');

  // Save results to file
  const resultsFile = `/tmp/benchmark_${prefix}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${resultsFile}\n`);

  return results;
}

function formatDuration(ms) {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms/1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms/60000).toFixed(1)}min`;
  return `${(ms/3600000).toFixed(2)}hr`;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const tokenCount = parseInt(args[0]) || 1000;
  const options = {
    uploadOnly: args.includes('--upload-only'),
    skipCleanup: args.includes('--skip-cleanup')
  };

  if (tokenCount > 100000) {
    console.log(`\n⚠️  WARNING: Testing with ${tokenCount.toLocaleString()} tokens.`);
    console.log('   This may take a while and consume Azure resources.\n');
  }

  await runBenchmark(tokenCount, options);
}

main().catch(console.error);
