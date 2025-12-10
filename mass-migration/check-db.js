const sql = require('mssql');

const config = {
  user: 'sqladmin',
  password: 'DiveDeep@2121',
  server: 'sql-tokenmigration-dev-oqt29j.database.windows.net',
  database: 'sqldb-tokenmigration-dev',
  options: { encrypt: true, trustServerCertificate: false }
};

async function checkDatabase() {
  try {
    const pool = await sql.connect(config);

    console.log('\n=== TOKEN_MIGRATION_BATCH ===');
    const batches = await pool.request().query('SELECT TOP 10 * FROM TOKEN_MIGRATION_BATCH ORDER BY CREATED_AT DESC');
    console.log('Rows:', batches.recordset.length);
    batches.recordset.forEach(r => console.log(JSON.stringify(r, null, 2)));

    console.log('\n=== MONERIS_TOKENS_STAGING ===');
    const tokens = await pool.request().query('SELECT TOP 10 * FROM MONERIS_TOKENS_STAGING ORDER BY CREATED_AT DESC');
    console.log('Rows:', tokens.recordset.length);
    tokens.recordset.forEach(r => console.log(JSON.stringify(r, null, 2)));

    console.log('\n=== TOKEN_MIGRATION_AUDIT_LOG ===');
    const audit = await pool.request().query('SELECT TOP 10 * FROM TOKEN_MIGRATION_AUDIT_LOG ORDER BY CREATED_AT DESC');
    console.log('Rows:', audit.recordset.length);
    audit.recordset.forEach(r => console.log(JSON.stringify(r, null, 2)));

    console.log('\n=== MIGRATION STATUS SUMMARY ===');
    const summary = await pool.request().query(`
      SELECT MIGRATION_STATUS, COUNT(*) as cnt
      FROM MONERIS_TOKENS_STAGING
      GROUP BY MIGRATION_STATUS
    `);
    summary.recordset.forEach(r => console.log(r.MIGRATION_STATUS + ': ' + r.cnt));

    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkDatabase();
