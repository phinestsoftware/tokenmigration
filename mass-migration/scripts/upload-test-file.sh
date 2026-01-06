#!/bin/bash
# Upload test file to Azure Blob Storage for token migration testing
# Usage: ./scripts/upload-test-file.sh [file_path] [token_prefix]
#
# Examples:
#   ./scripts/upload-test-file.sh                           # Creates and uploads test file with random tokens
#   ./scripts/upload-test-file.sh /tmp/myfile.csv           # Uploads existing file
#   ./scripts/upload-test-file.sh --generate 9999           # Creates file with 9999 token prefix

set -e

# Configuration
FUNCTION_APP="func-tokenmigration-dev-oqt29j"
RESOURCE_GROUP="rg-tokenmigration-dev"
CONTAINER="billing-input"
SOURCE_FOLDER="V21"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Token Migration File Upload Script ===${NC}"

# Get connection string from function app (avoids permission issues with --auth-mode login)
echo "Fetching storage connection string..."
CONNECTION_STRING=$(az functionapp config appsettings list \
  --name "$FUNCTION_APP" \
  --resource-group "$RESOURCE_GROUP" 2>/dev/null | jq -r '.[] | select(.name=="AzureWebJobsStorage") | .value')

if [ -z "$CONNECTION_STRING" ]; then
  echo -e "${RED}ERROR: Failed to get connection string from function app${NC}"
  echo "Make sure you are logged into Azure CLI: az login"
  exit 1
fi

echo -e "${GREEN}Connection string obtained successfully${NC}"

# Determine file to upload
if [ "$1" == "--generate" ] || [ -z "$1" ]; then
  # Generate a test file
  TOKEN_PREFIX="${2:-$(shuf -i 9700-9799 -n 1)}"
  # Format: SOURCE_ID.TYPE.YYYYMMDD.NNNN.extension (dots, not underscores!)
  # Example: V21.P.20251215.0123.input
  DATE=$(date +%Y%m%d)
  # Generate unique 4-digit sequence from last 4 digits of epoch seconds
  SEQUENCE=$(printf "%04d" $(($(date +%s) % 10000)))
  FILENAME="V21.P.${DATE}.${SEQUENCE}.input"
  FILE_PATH="/tmp/${FILENAME}"

  echo "Generating test file with token prefix: ${TOKEN_PREFIX}"

  cat > "$FILE_PATH" << EOF
MONERIS_TOKEN,EXP_DATE,ENTITY_ID,ENTITY_TYPE,ENTITY_STS,CREATION_DATE,LAST_USE_DATE,TRX_SEQ_NO,BUSINESS_UNIT,USAGE_TYPE
${TOKEN_PREFIX}050018246850,0139,E50001,1,O,20240115,20241201,,ROGERS,RECURRING
${TOKEN_PREFIX}050018246851,0625,E50002,1,O,20240220,20241115,,ROGERS,ONE_TIME
${TOKEN_PREFIX}050018246852,1226,E50003,2,O,20230510,20241105,,ROGERS,RECURRING
EOF

  echo -e "${GREEN}Generated file: ${FILE_PATH}${NC}"
  echo "Contents:"
  cat "$FILE_PATH"
  echo ""
else
  FILE_PATH="$1"
  if [ ! -f "$FILE_PATH" ]; then
    echo -e "${RED}ERROR: File not found: ${FILE_PATH}${NC}"
    exit 1
  fi
  FILENAME=$(basename "$FILE_PATH")
  TOKEN_PREFIX=$(grep -o '^9[0-9]\{3\}' "$FILE_PATH" | head -1 || echo "unknown")
fi

# Blob path MUST include source folder for trigger to work
# Trigger pattern: billing-input/{source}/{name}
BLOB_PATH="${SOURCE_FOLDER}/${FILENAME}"

echo ""
echo -e "${YELLOW}Upload Details:${NC}"
echo "  Local file:  ${FILE_PATH}"
echo "  Container:   ${CONTAINER}"
echo "  Blob path:   ${BLOB_PATH}"
echo "  Full path:   ${CONTAINER}/${BLOB_PATH}"
echo ""

# Upload
echo "Uploading..."
az storage blob upload \
  --connection-string "$CONNECTION_STRING" \
  --container-name "$CONTAINER" \
  --name "$BLOB_PATH" \
  --file "$FILE_PATH" \
  --overwrite \
  --output json 2>&1 | head -5

echo ""
echo -e "${GREEN}=== Upload Complete ===${NC}"
echo ""
echo "Token prefix to search for: ${TOKEN_PREFIX}"
echo ""
echo "To check results, run:"
echo "  node scripts/verify-migration.js ${TOKEN_PREFIX}"
echo ""
echo "Or query database directly:"
echo "  SELECT * FROM MONERIS_TOKENS_STAGING WHERE MONERIS_TOKEN LIKE '${TOKEN_PREFIX}%'"
