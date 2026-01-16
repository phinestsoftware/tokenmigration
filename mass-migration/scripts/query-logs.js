#!/usr/bin/env node
/**
 * Query Application Insights logs for debugging
 * Usage: node scripts/query-logs.js <query-type> [parameter]
 *
 * Query types:
 *   traces <file_id>     - Get traces for a specific file
 *   errors <file_id>     - Get errors for a specific file
 *   exceptions [minutes] - Get recent exceptions (default: 30 minutes)
 *   recent [minutes]     - Get recent traces (default: 10 minutes)
 *   function <name>      - Get traces for a specific function
 *   custom <kql>         - Run custom KQL query
 */

const { execSync } = require('child_process');

// Configuration - will be fetched dynamically
const RESOURCE_GROUP = 'rg-tokenmigration-dev';

function getAppInsightsName() {
  try {
    const result = execSync(
      `az resource list --resource-group ${RESOURCE_GROUP} --resource-type "Microsoft.Insights/components" --query "[0].name" -o tsv`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return result;
  } catch (error) {
    console.error('Failed to get App Insights name. Make sure you are logged in to Azure CLI.');
    process.exit(1);
  }
}

function runQuery(query) {
  const appInsights = getAppInsightsName();
  console.log(`App Insights: ${appInsights}`);
  console.log(`Running query...\n`);

  try {
    const result = execSync(
      `az monitor app-insights query --app "${appInsights}" --resource-group ${RESOURCE_GROUP} --analytics-query "${query.replace(/"/g, '\\"')}" --output json`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024 }
    );

    const data = JSON.parse(result);
    const rows = data.tables[0]?.rows || [];
    const columns = data.tables[0]?.columns || [];

    if (rows.length === 0) {
      console.log('No results found.');
      return;
    }

    console.log(`Found ${rows.length} results:\n`);

    // Format output
    rows.forEach((row, index) => {
      console.log(`--- Result ${index + 1} ---`);
      columns.forEach((col, i) => {
        const value = row[i];
        if (value) {
          // Try to parse JSON messages for better formatting
          if (col.name === 'message' && typeof value === 'string' && value.startsWith('{')) {
            try {
              const parsed = JSON.parse(value);
              console.log(`${col.name}:`);
              console.log(JSON.stringify(parsed, null, 2));
            } catch {
              console.log(`${col.name}: ${value}`);
            }
          } else {
            console.log(`${col.name}: ${value}`);
          }
        }
      });
      console.log('');
    });

  } catch (error) {
    console.error('Query failed:', error.message);
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
    process.exit(1);
  }
}

// Query templates
const queries = {
  traces: (fileId) => `
    traces
    | where timestamp > ago(2h)
    | where message contains '${fileId}'
    | project timestamp, message, severityLevel
    | order by timestamp desc
    | take 50
  `,

  errors: (fileId) => `
    traces
    | where timestamp > ago(2h)
    | where message contains '${fileId}'
    | where message contains 'ERROR' or message contains 'error' or message contains 'failed' or message contains 'Failed'
    | project timestamp, message
    | order by timestamp desc
    | take 30
  `,

  exceptions: (minutes = 30) => `
    exceptions
    | where timestamp > ago(${minutes}m)
    | project timestamp, outerMessage, innermostMessage, outerType
    | order by timestamp desc
    | take 20
  `,

  recent: (minutes = 10) => `
    traces
    | where timestamp > ago(${minutes}m)
    | project timestamp, message, severityLevel
    | order by timestamp desc
    | take 50
  `,

  function: (name) => `
    traces
    | where timestamp > ago(1h)
    | where message contains '"functionName":"${name}"'
    | project timestamp, message
    | order by timestamp desc
    | take 30
  `,

  executions: (minutes = 30) => `
    traces
    | where timestamp > ago(${minutes}m)
    | where message startswith 'Executing' or message startswith 'Executed'
    | project timestamp, message
    | order by timestamp desc
    | take 50
  `,

  timeouts: (minutes = 60) => `
    traces
    | where timestamp > ago(${minutes}m)
    | where message contains 'Timeout' or message contains 'timeout'
    | project timestamp, message
    | order by timestamp desc
    | take 30
  `,

  'mc-response': (fileId) => `
    traces
    | where timestamp > ago(2h)
    | where message contains '${fileId}'
    | where message contains 'MC response' or message contains 'mastercard-mapping' or message contains 'PG batch'
    | project timestamp, message
    | order by timestamp desc
    | take 30
  `,
};

// Main
const args = process.argv.slice(2);
const queryType = args[0];
const param = args[1];

if (!queryType) {
  console.log(`
Usage: node scripts/query-logs.js <query-type> [parameter]

Query types:
  traces <file_id>       - Get all traces for a specific file
  errors <file_id>       - Get errors for a specific file
  exceptions [minutes]   - Get recent exceptions (default: 30 minutes)
  recent [minutes]       - Get recent traces (default: 10 minutes)
  function <name>        - Get traces for a specific function name
  executions [minutes]   - Get function executions (default: 30 minutes)
  timeouts [minutes]     - Get timeout-related logs (default: 60 minutes)
  mc-response <file_id>  - Get MC response processing logs for a file
  custom <kql>           - Run custom KQL query

Examples:
  node scripts/query-logs.js traces V21.P.20260115.0005
  node scripts/query-logs.js errors V21.P.20260115.0005
  node scripts/query-logs.js exceptions 60
  node scripts/query-logs.js recent 5
  node scripts/query-logs.js function uploadFileHttp
  node scripts/query-logs.js timeouts 120
  node scripts/query-logs.js mc-response V21.P.20260115.0005
  node scripts/query-logs.js custom "traces | where timestamp > ago(1h) | take 10"
`);
  process.exit(0);
}

if (queryType === 'custom') {
  if (!param) {
    console.error('Error: Custom query requires a KQL query string');
    process.exit(1);
  }
  runQuery(param);
} else if (queries[queryType]) {
  const queryFn = queries[queryType];
  runQuery(queryFn(param));
} else {
  console.error(`Unknown query type: ${queryType}`);
  console.error('Run without arguments to see available query types.');
  process.exit(1);
}
