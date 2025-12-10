#!/bin/bash

# =====================================================
# Mass Migration Infrastructure Deployment Script
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
LOCATION="canadacentral"
SKIP_TERRAFORM=false
SKIP_SCHEMA=false
SKIP_FUNCTION_DEPLOY=false

# Print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment    Environment (dev|qa|pet|prod) [default: dev]"
    echo "  -l, --location       Azure region [default: canadacentral]"
    echo "  --skip-terraform     Skip Terraform deployment"
    echo "  --skip-schema        Skip database schema deployment"
    echo "  --skip-function      Skip Function App deployment"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev                    # Deploy to dev environment"
    echo "  $0 -e prod --skip-terraform  # Skip infra, deploy app only"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -l|--location)
            LOCATION="$2"
            shift 2
            ;;
        --skip-terraform)
            SKIP_TERRAFORM=true
            shift
            ;;
        --skip-schema)
            SKIP_SCHEMA=true
            shift
            ;;
        --skip-function)
            SKIP_FUNCTION_DEPLOY=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|qa|pet|prod)$ ]]; then
    echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Mass Migration Deployment${NC}"
echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}Location: $LOCATION${NC}"
echo -e "${GREEN}========================================${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    if ! command -v az &> /dev/null; then
        echo -e "${RED}Azure CLI not found. Please install it first.${NC}"
        exit 1
    fi

    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}Terraform not found. Please install it first.${NC}"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        echo -e "${RED}npm not found. Please install Node.js first.${NC}"
        exit 1
    fi

    if ! command -v func &> /dev/null; then
        echo -e "${RED}Azure Functions Core Tools not found. Please install it first.${NC}"
        echo "Run: npm install -g azure-functions-core-tools@4"
        exit 1
    fi

    # Check Azure login
    if ! az account show &> /dev/null; then
        echo -e "${RED}Not logged into Azure. Please run 'az login' first.${NC}"
        exit 1
    fi

    echo -e "${GREEN}All prerequisites met.${NC}"
}

# Deploy Terraform infrastructure
deploy_terraform() {
    if [ "$SKIP_TERRAFORM" = true ]; then
        echo -e "${YELLOW}Skipping Terraform deployment...${NC}"
        return
    fi

    echo -e "${YELLOW}Deploying Terraform infrastructure...${NC}"

    cd "$(dirname "$0")/.."

    # Initialize Terraform
    terraform init

    # Create terraform.tfvars if it doesn't exist
    if [ ! -f "terraform.tfvars" ]; then
        echo -e "${YELLOW}Creating terraform.tfvars from example...${NC}"
        cp example.tfvars terraform.tfvars
        echo -e "${RED}Please update terraform.tfvars with your values and run again.${NC}"
        exit 1
    fi

    # Plan
    terraform plan -var="environment=$ENVIRONMENT" -var="location=$LOCATION" -out=tfplan

    # Confirm
    read -p "Apply this plan? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled.${NC}"
        exit 0
    fi

    # Apply
    terraform apply tfplan

    # Save outputs
    terraform output -json > terraform-outputs.json

    echo -e "${GREEN}Terraform deployment completed.${NC}"

    cd -
}

# Deploy database schema
deploy_schema() {
    if [ "$SKIP_SCHEMA" = true ]; then
        echo -e "${YELLOW}Skipping schema deployment...${NC}"
        return
    fi

    echo -e "${YELLOW}Deploying database schema...${NC}"

    cd "$(dirname "$0")/.."

    # Get SQL connection details from Terraform output
    if [ -f "terraform-outputs.json" ]; then
        SQL_SERVER=$(jq -r '.sql_server_name.value' terraform-outputs.json)
        SQL_DB=$(jq -r '.sql_database_name.value' terraform-outputs.json)
    else
        echo -e "${RED}terraform-outputs.json not found. Run Terraform first.${NC}"
        exit 1
    fi

    # Check if sqlcmd is available
    if command -v sqlcmd &> /dev/null; then
        echo "Enter SQL admin username:"
        read SQL_USER
        echo "Enter SQL admin password:"
        read -s SQL_PASSWORD

        sqlcmd -S "${SQL_SERVER}.database.windows.net" \
               -d "$SQL_DB" \
               -U "$SQL_USER" \
               -P "$SQL_PASSWORD" \
               -i scripts/schema.sql
    else
        echo -e "${YELLOW}sqlcmd not found. Please run schema.sql manually:${NC}"
        echo "sqlcmd -S ${SQL_SERVER}.database.windows.net -d $SQL_DB -U <user> -P <password> -i scripts/schema.sql"
    fi

    echo -e "${GREEN}Schema deployment completed.${NC}"

    cd -
}

# Build and deploy Function App
deploy_function_app() {
    if [ "$SKIP_FUNCTION_DEPLOY" = true ]; then
        echo -e "${YELLOW}Skipping Function App deployment...${NC}"
        return
    fi

    echo -e "${YELLOW}Building and deploying Function App...${NC}"

    cd "$(dirname "$0")/../.."

    # Install dependencies
    echo "Installing dependencies..."
    npm ci

    # Build
    echo "Building TypeScript..."
    npm run build

    # Get function app name from Terraform output
    if [ -f "infra/terraform-outputs.json" ]; then
        FUNCTION_APP_NAME=$(jq -r '.function_app_name.value' infra/terraform-outputs.json)
    else
        echo -e "${RED}terraform-outputs.json not found. Run Terraform first.${NC}"
        exit 1
    fi

    # Deploy using Azure Functions Core Tools
    echo "Deploying to $FUNCTION_APP_NAME..."
    func azure functionapp publish "$FUNCTION_APP_NAME" --typescript

    echo -e "${GREEN}Function App deployment completed.${NC}"

    cd -
}

# Main execution
main() {
    check_prerequisites
    deploy_terraform
    deploy_schema
    deploy_function_app

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"

    # Print useful information
    if [ -f "$(dirname "$0")/../terraform-outputs.json" ]; then
        echo ""
        echo "Resources deployed:"
        echo "  Function App URL: $(jq -r '.function_app_url.value' $(dirname "$0")/../terraform-outputs.json)"
        echo "  Storage Account: $(jq -r '.storage_account_name.value' $(dirname "$0")/../terraform-outputs.json)"
        echo "  SQL Server: $(jq -r '.sql_server_name.value' $(dirname "$0")/../terraform-outputs.json)"
    fi
}

main
