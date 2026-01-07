#!/bin/bash

# ============================================================================
# Azure DevOps Setup Script for Mass Migration Pipeline
# ============================================================================
# This script automates the setup of Azure DevOps resources:
# - Project (if needed)
# - GitHub Service Connection
# - Azure Service Connections (per environment)
# - Variable Group
# - Environments with approvals
# - Pipeline from GitHub repo
#
# Prerequisites:
# 1. Azure CLI installed: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
# 2. Azure DevOps extension: az extension add --name azure-devops
# 3. Logged in: az login
# 4. GitHub PAT with repo access
# ============================================================================

set -e

# ============================================================================
# CONFIGURATION - These will be auto-detected or prompted
# ============================================================================

# GitHub Configuration (update these)
GITHUB_REPO_URL="https://github.com/phinestsoftware/rogers-mass-migration"
GITHUB_REPO_NAME="phinestsoftware/rogers-mass-migration"
GITHUB_SERVICE_CONNECTION_NAME="GitHub-MassMigration"

# Function App Names (from Terraform output - update these)
DEV_FUNCTION_APP_NAME="func-tokenmigration-dev-xxxxx"
QA_FUNCTION_APP_NAME="func-tokenmigration-qa-xxxxx"
PROD_FUNCTION_APP_NAME="func-tokenmigration-prod-xxxxx"

# Resource Groups (from Terraform - update these)
DEV_RESOURCE_GROUP="rg-tokenmigration-dev"
QA_RESOURCE_GROUP="rg-tokenmigration-qa"
PROD_RESOURCE_GROUP="rg-tokenmigration-prod"

# Approvers (Azure DevOps user emails - update these)
QA_APPROVERS="user1@company.com,user2@company.com"
PROD_APPROVERS="user1@company.com,user2@company.com,user3@company.com"

# These will be auto-detected
AZURE_SUBSCRIPTION_ID=""
AZURE_SUBSCRIPTION_NAME=""
AZURE_TENANT_ID=""
AZURE_DEVOPS_ORG=""
AZURE_DEVOPS_PROJECT=""

# ============================================================================
# COLORS FOR OUTPUT
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# ============================================================================
# PREREQUISITES CHECK
# ============================================================================
check_prerequisites() {
    print_step "Checking prerequisites..."

    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI not installed. Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi

    # Check Azure DevOps extension
    if ! az extension show --name azure-devops &> /dev/null; then
        print_step "Installing Azure DevOps extension..."
        az extension add --name azure-devops
    fi

    # Check if logged in
    if ! az account show &> /dev/null; then
        print_error "Not logged in to Azure CLI. Run: az login"
        exit 1
    fi

    echo "✓ All prerequisites met"
}

# ============================================================================
# AUTO-DETECT AZURE CONFIGURATION
# ============================================================================
auto_detect_azure_config() {
    print_step "Auto-detecting Azure configuration..."

    # Get current subscription details
    AZURE_SUBSCRIPTION_ID=$(az account show --query "id" -o tsv)
    AZURE_SUBSCRIPTION_NAME=$(az account show --query "name" -o tsv)
    AZURE_TENANT_ID=$(az account show --query "tenantId" -o tsv)

    echo "  Subscription ID:   $AZURE_SUBSCRIPTION_ID"
    echo "  Subscription Name: $AZURE_SUBSCRIPTION_NAME"
    echo "  Tenant ID:         $AZURE_TENANT_ID"

    # Confirm or allow selection of different subscription
    echo ""
    read -p "Use this subscription? (y/n): " CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        print_step "Available subscriptions:"
        az account list --query "[].{Name:name, ID:id, IsDefault:isDefault}" -o table
        echo ""
        read -p "Enter Subscription ID to use: " AZURE_SUBSCRIPTION_ID
        az account set --subscription "$AZURE_SUBSCRIPTION_ID"
        AZURE_SUBSCRIPTION_NAME=$(az account show --query "name" -o tsv)
        AZURE_TENANT_ID=$(az account show --query "tenantId" -o tsv)
    fi

    echo "✓ Azure subscription configured"
}

# ============================================================================
# AUTO-DETECT OR PROMPT FOR AZURE DEVOPS CONFIG
# ============================================================================
detect_azure_devops_config() {
    print_step "Detecting Azure DevOps configuration..."

    # Try to get existing default org
    EXISTING_ORG=$(az devops configure --list 2>/dev/null | grep "organization" | awk '{print $3}' || echo "")

    if [ -n "$EXISTING_ORG" ] && [ "$EXISTING_ORG" != "None" ]; then
        echo "  Found existing default org: $EXISTING_ORG"
        read -p "Use this organization? (y/n): " CONFIRM
        if [[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]]; then
            AZURE_DEVOPS_ORG="$EXISTING_ORG"
        fi
    fi

    # If no org yet, prompt
    if [ -z "$AZURE_DEVOPS_ORG" ]; then
        echo ""
        echo "Azure DevOps organization URL is required."
        echo "Format: https://dev.azure.com/YOUR_ORG"
        read -p "Enter Azure DevOps Organization URL: " AZURE_DEVOPS_ORG
    fi

    # Try to list projects and let user select
    print_step "Fetching projects from $AZURE_DEVOPS_ORG..."

    PROJECTS=$(az devops project list --org "$AZURE_DEVOPS_ORG" --query "value[].name" -o tsv 2>/dev/null || echo "")

    if [ -n "$PROJECTS" ]; then
        echo ""
        echo "Available projects:"
        echo "$PROJECTS" | nl -w2 -s'. '
        echo ""
        echo "Enter project name from above, or enter a new project name to create it:"
        read -p "Project name: " AZURE_DEVOPS_PROJECT
    else
        echo ""
        read -p "Enter Azure DevOps Project name (will be created if doesn't exist): " AZURE_DEVOPS_PROJECT
    fi

    echo ""
    echo "  Organization: $AZURE_DEVOPS_ORG"
    echo "  Project:      $AZURE_DEVOPS_PROJECT"
    echo "✓ Azure DevOps configuration set"
}

# ============================================================================
# AUTO-DETECT FUNCTION APP NAMES FROM AZURE (if deployed)
# ============================================================================
detect_function_apps() {
    print_step "Looking for existing Function Apps in Azure..."

    # Try to find function apps matching our naming pattern
    FOUND_APPS=$(az functionapp list --query "[?contains(name, 'tokenmigration')].{name:name, resourceGroup:resourceGroup}" -o tsv 2>/dev/null || echo "")

    if [ -n "$FOUND_APPS" ]; then
        echo "Found Function Apps:"
        echo "$FOUND_APPS"
        echo ""
        read -p "Auto-configure from these? (y/n): " CONFIRM

        if [[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]]; then
            # Parse and assign
            DEV_APP=$(az functionapp list --query "[?contains(name, 'tokenmigration') && contains(name, 'dev')].name" -o tsv 2>/dev/null | head -1)
            QA_APP=$(az functionapp list --query "[?contains(name, 'tokenmigration') && contains(name, 'qa')].name" -o tsv 2>/dev/null | head -1)
            PROD_APP=$(az functionapp list --query "[?contains(name, 'tokenmigration') && contains(name, 'prod')].name" -o tsv 2>/dev/null | head -1)

            [ -n "$DEV_APP" ] && DEV_FUNCTION_APP_NAME="$DEV_APP"
            [ -n "$QA_APP" ] && QA_FUNCTION_APP_NAME="$QA_APP"
            [ -n "$PROD_APP" ] && PROD_FUNCTION_APP_NAME="$PROD_APP"

            # Also get resource groups
            DEV_RG=$(az functionapp list --query "[?name=='$DEV_FUNCTION_APP_NAME'].resourceGroup" -o tsv 2>/dev/null | head -1)
            QA_RG=$(az functionapp list --query "[?name=='$QA_FUNCTION_APP_NAME'].resourceGroup" -o tsv 2>/dev/null | head -1)
            PROD_RG=$(az functionapp list --query "[?name=='$PROD_FUNCTION_APP_NAME'].resourceGroup" -o tsv 2>/dev/null | head -1)

            [ -n "$DEV_RG" ] && DEV_RESOURCE_GROUP="$DEV_RG"
            [ -n "$QA_RG" ] && QA_RESOURCE_GROUP="$QA_RG"
            [ -n "$PROD_RG" ] && PROD_RESOURCE_GROUP="$PROD_RG"
        fi
    else
        echo "No existing Function Apps found matching 'tokenmigration'."
        echo "Using default names from configuration."
    fi

    echo ""
    echo "Function App configuration:"
    echo "  Dev:  $DEV_FUNCTION_APP_NAME ($DEV_RESOURCE_GROUP)"
    echo "  QA:   $QA_FUNCTION_APP_NAME ($QA_RESOURCE_GROUP)"
    echo "  Prod: $PROD_FUNCTION_APP_NAME ($PROD_RESOURCE_GROUP)"
    echo ""
    read -p "Continue with these values? (y/n): " CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        read -p "Dev Function App name: " DEV_FUNCTION_APP_NAME
        read -p "Dev Resource Group: " DEV_RESOURCE_GROUP
        read -p "QA Function App name: " QA_FUNCTION_APP_NAME
        read -p "QA Resource Group: " QA_RESOURCE_GROUP
        read -p "Prod Function App name: " PROD_FUNCTION_APP_NAME
        read -p "Prod Resource Group: " PROD_RESOURCE_GROUP
    fi
}

# ============================================================================
# PROMPT FOR SECRETS
# ============================================================================
prompt_for_secrets() {
    print_step "Collecting credentials..."

    # GitHub PAT
    if [ -z "$GITHUB_PAT" ]; then
        echo -e "\n${YELLOW}GitHub Personal Access Token (PAT) required${NC}"
        echo "Create one at: https://github.com/settings/tokens"
        echo "Required scopes: repo, admin:repo_hook"
        read -sp "Enter GitHub PAT: " GITHUB_PAT
        echo ""
    fi

    # Azure Service Principal (for deployments)
    if [ -z "$AZURE_SP_ID" ]; then
        echo -e "\n${YELLOW}Azure Service Principal required for deployments${NC}"
        echo "Create one with: az ad sp create-for-rbac --name 'MassMigration-DevOps' --role contributor"
        read -p "Enter Service Principal App ID: " AZURE_SP_ID
        read -sp "Enter Service Principal Secret: " AZURE_SP_SECRET
        echo ""
        read -p "Enter Tenant ID: " AZURE_TENANT_ID
    fi
}

# ============================================================================
# SET DEFAULTS
# ============================================================================
set_defaults() {
    print_step "Setting Azure DevOps defaults..."

    az devops configure --defaults organization="$AZURE_DEVOPS_ORG" project="$AZURE_DEVOPS_PROJECT"

    echo "✓ Defaults set for org: $AZURE_DEVOPS_ORG, project: $AZURE_DEVOPS_PROJECT"
}

# ============================================================================
# CREATE PROJECT (if needed)
# ============================================================================
create_project_if_needed() {
    print_step "Checking if project exists..."

    if az devops project show --project "$AZURE_DEVOPS_PROJECT" &> /dev/null; then
        echo "✓ Project '$AZURE_DEVOPS_PROJECT' already exists"
    else
        print_step "Creating project '$AZURE_DEVOPS_PROJECT'..."
        az devops project create \
            --name "$AZURE_DEVOPS_PROJECT" \
            --description "Mass Migration Token Processing" \
            --visibility private \
            --source-control git \
            --process Agile
        echo "✓ Project created"
    fi
}

# ============================================================================
# CREATE GITHUB SERVICE CONNECTION
# ============================================================================
create_github_service_connection() {
    print_step "Creating GitHub service connection..."

    # Check if already exists
    EXISTING=$(az devops service-endpoint list --query "[?name=='$GITHUB_SERVICE_CONNECTION_NAME'].id" -o tsv 2>/dev/null || echo "")

    if [ -n "$EXISTING" ]; then
        echo "✓ GitHub service connection '$GITHUB_SERVICE_CONNECTION_NAME' already exists (ID: $EXISTING)"
        GITHUB_SC_ID=$EXISTING
        return
    fi

    # Create the service connection
    GITHUB_SC_ID=$(az devops service-endpoint github create \
        --github-url "$GITHUB_REPO_URL" \
        --name "$GITHUB_SERVICE_CONNECTION_NAME" \
        --query 'id' -o tsv)

    # Authorize for all pipelines
    az devops service-endpoint update \
        --id "$GITHUB_SC_ID" \
        --enable-for-all true

    echo "✓ GitHub service connection created (ID: $GITHUB_SC_ID)"
}

# ============================================================================
# CREATE AZURE SERVICE CONNECTIONS
# ============================================================================
create_azure_service_connection() {
    local ENV_NAME=$1
    local RESOURCE_GROUP=$2
    local SC_NAME="Azure-MassMigration-${ENV_NAME}"

    print_step "Creating Azure service connection for $ENV_NAME..."

    # Check if already exists
    EXISTING=$(az devops service-endpoint list --query "[?name=='$SC_NAME'].id" -o tsv 2>/dev/null || echo "")

    if [ -n "$EXISTING" ]; then
        echo "✓ Azure service connection '$SC_NAME' already exists"
        return
    fi

    # Create service connection using service principal
    SC_ID=$(az devops service-endpoint azurerm create \
        --azure-rm-service-principal-id "$AZURE_SP_ID" \
        --azure-rm-subscription-id "$AZURE_SUBSCRIPTION_ID" \
        --azure-rm-subscription-name "$AZURE_SUBSCRIPTION_NAME" \
        --azure-rm-tenant-id "$AZURE_TENANT_ID" \
        --name "$SC_NAME" \
        --query 'id' -o tsv <<< "$AZURE_SP_SECRET")

    # Authorize for all pipelines
    az devops service-endpoint update \
        --id "$SC_ID" \
        --enable-for-all true

    echo "✓ Azure service connection '$SC_NAME' created"
}

create_all_azure_service_connections() {
    create_azure_service_connection "Dev" "$DEV_RESOURCE_GROUP"
    create_azure_service_connection "QA" "$QA_RESOURCE_GROUP"
    create_azure_service_connection "Prod" "$PROD_RESOURCE_GROUP"
}

# ============================================================================
# CREATE VARIABLE GROUP
# ============================================================================
create_variable_group() {
    print_step "Creating variable group..."

    local VG_NAME="MassMigration-Variables"

    # Check if already exists
    EXISTING=$(az pipelines variable-group list --query "[?name=='$VG_NAME'].id" -o tsv 2>/dev/null || echo "")

    if [ -n "$EXISTING" ]; then
        echo "✓ Variable group '$VG_NAME' already exists (ID: $EXISTING)"
        return
    fi

    # Create variable group with variables
    VG_ID=$(az pipelines variable-group create \
        --name "$VG_NAME" \
        --description "Variables for Mass Migration pipeline" \
        --authorize true \
        --variables \
            devFunctionAppName="$DEV_FUNCTION_APP_NAME" \
            qaFunctionAppName="$QA_FUNCTION_APP_NAME" \
            prodFunctionAppName="$PROD_FUNCTION_APP_NAME" \
            devResourceGroup="$DEV_RESOURCE_GROUP" \
            qaResourceGroup="$QA_RESOURCE_GROUP" \
            prodResourceGroup="$PROD_RESOURCE_GROUP" \
        --query 'id' -o tsv)

    echo "✓ Variable group created (ID: $VG_ID)"
}

# ============================================================================
# CREATE ENVIRONMENTS
# ============================================================================
create_environment() {
    local ENV_NAME=$1
    local DESCRIPTION=$2

    print_step "Creating environment: $ENV_NAME..."

    # Check if exists (environments API doesn't have a direct check)
    # We'll just create and ignore errors if it exists
    az devops invoke \
        --area distributedtask \
        --resource environments \
        --route-parameters project="$AZURE_DEVOPS_PROJECT" \
        --http-method POST \
        --api-version 7.1 \
        --in-file <(cat <<EOF
{
    "name": "$ENV_NAME",
    "description": "$DESCRIPTION"
}
EOF
) 2>/dev/null || echo "Environment may already exist, continuing..."

    echo "✓ Environment '$ENV_NAME' ready"
}

create_all_environments() {
    create_environment "mass-migration-dev" "Development environment - auto-deploy"
    create_environment "mass-migration-qa" "QA environment - requires approval"
    create_environment "mass-migration-prod" "Production environment - requires approval"

    print_warning "Manual step required: Add approvals to QA and Prod environments"
    echo "  1. Go to: $AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_environments"
    echo "  2. Click on 'mass-migration-qa' > Approvals and checks > Add check > Approvals"
    echo "  3. Add approvers: $QA_APPROVERS"
    echo "  4. Repeat for 'mass-migration-prod' with approvers: $PROD_APPROVERS"
}

# ============================================================================
# CREATE PIPELINE
# ============================================================================
create_pipeline() {
    print_step "Creating pipeline..."

    local PIPELINE_NAME="MassMigration-CI-CD"

    # Check if already exists
    EXISTING=$(az pipelines list --query "[?name=='$PIPELINE_NAME'].id" -o tsv 2>/dev/null || echo "")

    if [ -n "$EXISTING" ]; then
        echo "✓ Pipeline '$PIPELINE_NAME' already exists (ID: $EXISTING)"
        return
    fi

    # Create pipeline from GitHub repo
    PIPELINE_ID=$(az pipelines create \
        --name "$PIPELINE_NAME" \
        --description "CI/CD pipeline for Mass Migration Azure Functions" \
        --repository "$GITHUB_REPO_NAME" \
        --repository-type github \
        --branch main \
        --yml-path azure-pipelines.yml \
        --service-connection "$GITHUB_SERVICE_CONNECTION_NAME" \
        --skip-first-run true \
        --query 'id' -o tsv)

    echo "✓ Pipeline created (ID: $PIPELINE_ID)"
    echo "  View at: $AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_build?definitionId=$PIPELINE_ID"
}

# ============================================================================
# MAIN
# ============================================================================
main() {
    echo "=============================================="
    echo "Azure DevOps Setup for Mass Migration"
    echo "=============================================="

    check_prerequisites

    # Auto-detect configuration from Azure CLI login
    auto_detect_azure_config
    detect_azure_devops_config
    detect_function_apps

    # Prompt for remaining secrets (GitHub PAT, Service Principal)
    prompt_for_secrets

    # Set Azure DevOps CLI defaults
    set_defaults

    # Create all resources
    create_project_if_needed
    create_github_service_connection
    create_all_azure_service_connections
    create_variable_group
    create_all_environments
    create_pipeline

    echo ""
    echo "=============================================="
    echo -e "${GREEN}Setup Complete!${NC}"
    echo "=============================================="
    echo ""
    echo "Next steps:"
    echo "1. Add approvals to QA/Prod environments (see instructions above)"
    echo "2. Ensure 'azure-pipelines.yml' exists in your GitHub repo"
    echo "3. Push code changes to trigger the pipeline"
    echo ""
    echo "Pipeline URL: $AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_build"
    echo "Environments: $AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_environments"
}

# ============================================================================
# RUN
# ============================================================================

# Allow sourcing without running
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
