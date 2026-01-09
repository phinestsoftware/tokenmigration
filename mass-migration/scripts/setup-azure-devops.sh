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
# 4. .env file configured (copy from .env.example)
#
# Usage:
#   ./setup-azure-devops.sh              # Interactive mode
#   ./setup-azure-devops.sh --auto       # Non-interactive (requires .env)
#   ./setup-azure-devops.sh --help       # Show help
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

# ============================================================================
# COLORS FOR OUTPUT
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_info() {
    echo -e "${CYAN}INFO:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# ============================================================================
# HELP
# ============================================================================
show_help() {
    cat << EOF
Azure DevOps Setup Script for Mass Migration

Usage: $(basename "$0") [OPTIONS]

Options:
  --auto        Run in non-interactive mode (requires .env file)
  --env FILE    Use specified env file instead of .env
  --help        Show this help message

Setup Steps:
  1. Copy .env.example to .env
  2. Fill in your configuration values
  3. Run this script

Example:
  cp .env.example .env
  # Edit .env with your values
  ./$(basename "$0")

For more information, see the README.md
EOF
    exit 0
}

# ============================================================================
# LOAD .ENV FILE
# ============================================================================
load_env_file() {
    if [ -f "$ENV_FILE" ]; then
        print_step "Loading configuration from $ENV_FILE"
        # Export variables from .env file, ignoring comments and empty lines
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip empty lines and comments
            [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
            # Export the variable
            eval "export $line"
        done < "$ENV_FILE"
        print_success "Configuration loaded"
        return 0
    else
        return 1
    fi
}

# ============================================================================
# VALIDATE REQUIRED VARIABLES
# ============================================================================
validate_env() {
    local missing=()

    [ -z "$GITHUB_REPO_URL" ] && missing+=("GITHUB_REPO_URL")
    [ -z "$GITHUB_REPO_NAME" ] && missing+=("GITHUB_REPO_NAME")
    [ -z "$AZURE_DEVOPS_ORG" ] && missing+=("AZURE_DEVOPS_ORG")
    [ -z "$AZURE_DEVOPS_PROJECT" ] && missing+=("AZURE_DEVOPS_PROJECT")
    [ -z "$AZURE_DEVOPS_EXT_PAT" ] && missing+=("AZURE_DEVOPS_EXT_PAT")

    if [ ${#missing[@]} -gt 0 ]; then
        print_error "Missing required configuration:"
        for var in "${missing[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Please configure these in your .env file"
        return 1
    fi

    return 0
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
    echo "  ✓ Azure CLI installed"

    # Check Azure DevOps extension
    if ! az extension show --name azure-devops &> /dev/null; then
        print_info "Installing Azure DevOps extension..."
        az extension add --name azure-devops
    fi
    echo "  ✓ Azure DevOps extension installed"

    # Check if logged in
    if ! az account show &> /dev/null; then
        print_error "Not logged in to Azure CLI. Run: az login"
        exit 1
    fi
    echo "  ✓ Azure CLI logged in"

    print_success "All prerequisites met"
}

# ============================================================================
# AUTO-DETECT AZURE CONFIGURATION
# ============================================================================
auto_detect_azure_config() {
    print_step "Detecting Azure configuration..."

    # Only auto-detect if not already set
    if [ -z "$AZURE_SUBSCRIPTION_ID" ]; then
        AZURE_SUBSCRIPTION_ID=$(az account show --query "id" -o tsv)
    fi
    if [ -z "$AZURE_SUBSCRIPTION_NAME" ]; then
        AZURE_SUBSCRIPTION_NAME=$(az account show --query "name" -o tsv)
    fi
    if [ -z "$AZURE_TENANT_ID" ]; then
        AZURE_TENANT_ID=$(az account show --query "tenantId" -o tsv)
    fi

    echo "  Subscription ID:   $AZURE_SUBSCRIPTION_ID"
    echo "  Subscription Name: $AZURE_SUBSCRIPTION_NAME"
    echo "  Tenant ID:         $AZURE_TENANT_ID"

    if [ "$AUTO_MODE" != "true" ]; then
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
    fi

    print_success "Azure subscription configured"
}

# ============================================================================
# AUTO-DETECT FUNCTION APPS FROM AZURE
# ============================================================================
detect_function_apps() {
    print_step "Detecting deployed Function Apps..."

    # Only detect if not already set
    if [ -z "$DEV_FUNCTION_APP_NAME" ]; then
        DEV_FUNCTION_APP_NAME=$(az functionapp list --query "[?contains(name, 'tokenmigration') && contains(name, 'dev')].name" -o tsv 2>/dev/null | head -1 || echo "")
        if [ -n "$DEV_FUNCTION_APP_NAME" ]; then
            DEV_RESOURCE_GROUP=$(az functionapp show --name "$DEV_FUNCTION_APP_NAME" --query "resourceGroup" -o tsv 2>/dev/null || echo "rg-tokenmigration-dev")
        fi
    fi

    if [ -z "$QA_FUNCTION_APP_NAME" ]; then
        QA_FUNCTION_APP_NAME=$(az functionapp list --query "[?contains(name, 'tokenmigration') && contains(name, 'qa')].name" -o tsv 2>/dev/null | head -1 || echo "")
        if [ -n "$QA_FUNCTION_APP_NAME" ]; then
            QA_RESOURCE_GROUP=$(az functionapp show --name "$QA_FUNCTION_APP_NAME" --query "resourceGroup" -o tsv 2>/dev/null || echo "rg-tokenmigration-qa")
        fi
    fi

    if [ -z "$PROD_FUNCTION_APP_NAME" ]; then
        PROD_FUNCTION_APP_NAME=$(az functionapp list --query "[?contains(name, 'tokenmigration') && contains(name, 'prod')].name" -o tsv 2>/dev/null | head -1 || echo "")
        if [ -n "$PROD_FUNCTION_APP_NAME" ]; then
            PROD_RESOURCE_GROUP=$(az functionapp show --name "$PROD_FUNCTION_APP_NAME" --query "resourceGroup" -o tsv 2>/dev/null || echo "rg-tokenmigration-prod")
        fi
    fi

    echo "  Dev:  ${DEV_FUNCTION_APP_NAME:-'(not deployed)'} (${DEV_RESOURCE_GROUP:-'N/A'})"
    echo "  QA:   ${QA_FUNCTION_APP_NAME:-'(not deployed)'} (${QA_RESOURCE_GROUP:-'N/A'})"
    echo "  Prod: ${PROD_FUNCTION_APP_NAME:-'(not deployed)'} (${PROD_RESOURCE_GROUP:-'N/A'})"

    if [ -z "$DEV_FUNCTION_APP_NAME" ]; then
        print_warning "No Dev Function App found. Deploy infrastructure first or set DEV_FUNCTION_APP_NAME in .env"
    fi
}

# ============================================================================
# PROMPT FOR SECRETS (interactive mode only)
# ============================================================================
prompt_for_secrets() {
    if [ "$AUTO_MODE" == "true" ]; then
        # In auto mode, just validate that secrets exist
        if [ -z "$GITHUB_PAT" ]; then
            print_error "GITHUB_PAT not set in .env file"
            exit 1
        fi
        if [ -z "$AZURE_SP_ID" ] || [ -z "$AZURE_SP_SECRET" ]; then
            print_warning "Azure Service Principal not configured. Azure service connections will be skipped."
            SKIP_AZURE_CONNECTIONS="true"
        fi
        return
    fi

    print_step "Collecting credentials..."

    # GitHub PAT
    if [ -z "$GITHUB_PAT" ]; then
        echo -e "\n${YELLOW}GitHub Personal Access Token (PAT) required${NC}"
        echo "Create one at: https://github.com/settings/tokens"
        echo "Required scopes: repo, admin:repo_hook"
        read -sp "Enter GitHub PAT: " GITHUB_PAT
        echo ""
    fi

    # Azure Service Principal
    if [ -z "$AZURE_SP_ID" ]; then
        echo -e "\n${YELLOW}Azure Service Principal for deployments${NC}"
        echo "Create one with:"
        echo "  az ad sp create-for-rbac --name 'MassMigration-DevOps' --role contributor --scopes /subscriptions/$AZURE_SUBSCRIPTION_ID"
        echo ""
        read -p "Enter Service Principal App ID (or press Enter to skip): " AZURE_SP_ID

        if [ -n "$AZURE_SP_ID" ]; then
            read -sp "Enter Service Principal Secret: " AZURE_SP_SECRET
            echo ""
        else
            print_warning "Skipping Azure service connections setup"
            SKIP_AZURE_CONNECTIONS="true"
        fi
    fi
}

# ============================================================================
# SET AZURE DEVOPS DEFAULTS
# ============================================================================
set_defaults() {
    print_step "Setting Azure DevOps defaults..."
    az devops configure --defaults organization="$AZURE_DEVOPS_ORG" project="$AZURE_DEVOPS_PROJECT"
    print_success "Defaults set for org: $AZURE_DEVOPS_ORG, project: $AZURE_DEVOPS_PROJECT"
}

# ============================================================================
# CREATE PROJECT (if needed)
# ============================================================================
create_project_if_needed() {
    if [ "$SKIP_PROJECT_CREATION" == "true" ]; then
        print_info "Skipping project creation (SKIP_PROJECT_CREATION=true)"
        return
    fi

    print_step "Checking if project exists..."

    if az devops project show --project "$AZURE_DEVOPS_PROJECT" &> /dev/null; then
        print_success "Project '$AZURE_DEVOPS_PROJECT' already exists"
    else
        print_step "Creating project '$AZURE_DEVOPS_PROJECT'..."
        az devops project create \
            --name "$AZURE_DEVOPS_PROJECT" \
            --description "Mass Migration Token Processing" \
            --visibility private \
            --source-control git \
            --process Agile
        print_success "Project created"
    fi
}

# ============================================================================
# CREATE GITHUB SERVICE CONNECTION
# ============================================================================
create_github_service_connection() {
    if [ "$SKIP_GITHUB_CONNECTION" == "true" ]; then
        print_info "Skipping GitHub connection (SKIP_GITHUB_CONNECTION=true)"
        return
    fi

    print_step "Creating GitHub service connection..."

    local SC_NAME="${GITHUB_SERVICE_CONNECTION_NAME:-GitHub-MassMigration}"

    # Check if already exists
    EXISTING=$(az devops service-endpoint list --query "[?name=='$SC_NAME'].id" -o tsv 2>/dev/null || echo "")

    if [ -n "$EXISTING" ]; then
        print_success "GitHub service connection '$SC_NAME' already exists (ID: $EXISTING)"
        GITHUB_SC_ID=$EXISTING
        return
    fi

    # Create using PAT
    export AZURE_DEVOPS_EXT_GITHUB_PAT="$GITHUB_PAT"

    GITHUB_SC_ID=$(az devops service-endpoint github create \
        --github-url "$GITHUB_REPO_URL" \
        --name "$SC_NAME" \
        --query 'id' -o tsv 2>/dev/null) || {
        print_error "Failed to create GitHub service connection"
        print_info "You may need to create it manually in Azure DevOps"
        return 1
    }

    # Authorize for all pipelines
    az devops service-endpoint update \
        --id "$GITHUB_SC_ID" \
        --enable-for-all true 2>/dev/null || true

    print_success "GitHub service connection created (ID: $GITHUB_SC_ID)"
}

# ============================================================================
# CREATE AZURE SERVICE CONNECTION
# ============================================================================
create_azure_service_connection() {
    local ENV_NAME=$1
    local RESOURCE_GROUP=$2
    local SC_NAME="Azure-MassMigration-${ENV_NAME}"

    print_step "Creating Azure service connection for $ENV_NAME..."

    # Check if already exists
    EXISTING=$(az devops service-endpoint list --query "[?name=='$SC_NAME'].id" -o tsv 2>/dev/null || echo "")

    if [ -n "$EXISTING" ]; then
        print_success "Azure service connection '$SC_NAME' already exists"
        return
    fi

    if [ -z "$AZURE_SP_ID" ] || [ -z "$AZURE_SP_SECRET" ]; then
        print_warning "Service Principal not configured, skipping $SC_NAME"
        return
    fi

    # Create service connection
    export AZURE_DEVOPS_EXT_AZURE_RM_SERVICE_PRINCIPAL_KEY="$AZURE_SP_SECRET"

    SC_ID=$(az devops service-endpoint azurerm create \
        --azure-rm-service-principal-id "$AZURE_SP_ID" \
        --azure-rm-subscription-id "$AZURE_SUBSCRIPTION_ID" \
        --azure-rm-subscription-name "$AZURE_SUBSCRIPTION_NAME" \
        --azure-rm-tenant-id "$AZURE_TENANT_ID" \
        --name "$SC_NAME" \
        --query 'id' -o tsv 2>/dev/null) || {
        print_error "Failed to create Azure service connection for $ENV_NAME"
        return 1
    }

    # Authorize for all pipelines
    az devops service-endpoint update \
        --id "$SC_ID" \
        --enable-for-all true 2>/dev/null || true

    print_success "Azure service connection '$SC_NAME' created"
}

create_all_azure_service_connections() {
    if [ "$SKIP_AZURE_CONNECTIONS" == "true" ]; then
        print_info "Skipping Azure connections (SKIP_AZURE_CONNECTIONS=true)"
        return
    fi

    create_azure_service_connection "Dev" "$DEV_RESOURCE_GROUP"
    [ -n "$QA_FUNCTION_APP_NAME" ] && create_azure_service_connection "QA" "$QA_RESOURCE_GROUP"
    [ -n "$PROD_FUNCTION_APP_NAME" ] && create_azure_service_connection "Prod" "$PROD_RESOURCE_GROUP"
}

# ============================================================================
# CREATE VARIABLE GROUP
# ============================================================================
create_variable_group() {
    if [ "$SKIP_VARIABLE_GROUP" == "true" ]; then
        print_info "Skipping variable group (SKIP_VARIABLE_GROUP=true)"
        return
    fi

    print_step "Creating variable group..."

    local VG_NAME="MassMigration-Variables"

    # Check if already exists
    EXISTING=$(az pipelines variable-group list --query "[?name=='$VG_NAME'].id" -o tsv 2>/dev/null || echo "")

    if [ -n "$EXISTING" ]; then
        print_success "Variable group '$VG_NAME' already exists (ID: $EXISTING)"

        # Update variables if they exist
        print_info "Updating variable group with current values..."
        az pipelines variable-group variable update --group-id "$EXISTING" --name "devFunctionAppName" --value "${DEV_FUNCTION_APP_NAME:-TBD}" 2>/dev/null || \
        az pipelines variable-group variable create --group-id "$EXISTING" --name "devFunctionAppName" --value "${DEV_FUNCTION_APP_NAME:-TBD}" 2>/dev/null || true
        return
    fi

    # Create variable group with variables
    VG_ID=$(az pipelines variable-group create \
        --name "$VG_NAME" \
        --description "Variables for Mass Migration pipeline" \
        --authorize true \
        --variables \
            devFunctionAppName="${DEV_FUNCTION_APP_NAME:-TBD}" \
            qaFunctionAppName="${QA_FUNCTION_APP_NAME:-TBD}" \
            prodFunctionAppName="${PROD_FUNCTION_APP_NAME:-TBD}" \
            devResourceGroup="${DEV_RESOURCE_GROUP:-rg-tokenmigration-dev}" \
            qaResourceGroup="${QA_RESOURCE_GROUP:-rg-tokenmigration-qa}" \
            prodResourceGroup="${PROD_RESOURCE_GROUP:-rg-tokenmigration-prod}" \
        --query 'id' -o tsv 2>/dev/null) || {
        print_error "Failed to create variable group"
        return 1
    }

    print_success "Variable group created (ID: $VG_ID)"
}

# ============================================================================
# CREATE ENVIRONMENTS
# ============================================================================
create_environment() {
    local ENV_NAME=$1
    local DESCRIPTION=$2

    # Create environment via REST API
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
) &>/dev/null || true

    echo "  ✓ Environment '$ENV_NAME' ready"
}

create_all_environments() {
    if [ "$SKIP_ENVIRONMENTS" == "true" ]; then
        print_info "Skipping environments (SKIP_ENVIRONMENTS=true)"
        return
    fi

    print_step "Creating environments..."

    create_environment "mass-migration-dev" "Development environment - auto-deploy"
    create_environment "mass-migration-qa" "QA environment - requires approval"
    create_environment "mass-migration-prod" "Production environment - requires approval"

    echo ""
    print_warning "Manual step required: Add approvals to QA and Prod environments"
    echo "  1. Go to: $AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_environments"
    echo "  2. Click on 'mass-migration-qa' > Approvals and checks > Add check > Approvals"
    echo "  3. Add approvers: ${QA_APPROVERS:-'(configure in .env)'}"
    echo "  4. Repeat for 'mass-migration-prod' with approvers: ${PROD_APPROVERS:-'(configure in .env)'}"
}

# ============================================================================
# CREATE PIPELINE
# ============================================================================
create_pipeline() {
    if [ "$SKIP_PIPELINE" == "true" ]; then
        print_info "Skipping pipeline (SKIP_PIPELINE=true)"
        return
    fi

    print_step "Creating pipeline..."

    local PIPELINE_NAME="MassMigration-CI-CD"

    # Check if already exists
    EXISTING=$(az pipelines list --query "[?name=='$PIPELINE_NAME'].id" -o tsv 2>/dev/null || echo "")

    if [ -n "$EXISTING" ]; then
        print_success "Pipeline '$PIPELINE_NAME' already exists (ID: $EXISTING)"
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
        --service-connection "${GITHUB_SERVICE_CONNECTION_NAME:-GitHub-MassMigration}" \
        --skip-first-run true \
        --query 'id' -o tsv 2>/dev/null) || {
        print_error "Failed to create pipeline"
        print_info "You may need to create it manually in Azure DevOps"
        return 1
    }

    print_success "Pipeline created (ID: $PIPELINE_ID)"
    echo "  View at: $AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_build?definitionId=$PIPELINE_ID"
}

# ============================================================================
# SAVE DETECTED VALUES TO .ENV
# ============================================================================
save_detected_values() {
    if [ "$AUTO_MODE" == "true" ]; then
        return
    fi

    echo ""
    read -p "Save detected values to .env file? (y/n): " SAVE_ENV
    if [[ "$SAVE_ENV" == "y" || "$SAVE_ENV" == "Y" ]]; then
        # Create or update .env file
        cat > "$ENV_FILE" << EOF
# ============================================================================
# Azure DevOps Pipeline Setup - Environment Configuration
# Generated on $(date)
# ============================================================================

# GitHub Configuration
GITHUB_REPO_URL="$GITHUB_REPO_URL"
GITHUB_REPO_NAME="$GITHUB_REPO_NAME"
GITHUB_SERVICE_CONNECTION_NAME="${GITHUB_SERVICE_CONNECTION_NAME:-GitHub-MassMigration}"
GITHUB_PAT=""  # Add your GitHub PAT here

# Azure DevOps Configuration
AZURE_DEVOPS_ORG="$AZURE_DEVOPS_ORG"
AZURE_DEVOPS_PROJECT="$AZURE_DEVOPS_PROJECT"

# Azure Subscription
AZURE_SUBSCRIPTION_ID="$AZURE_SUBSCRIPTION_ID"
AZURE_SUBSCRIPTION_NAME="$AZURE_SUBSCRIPTION_NAME"
AZURE_TENANT_ID="$AZURE_TENANT_ID"

# Azure Service Principal
AZURE_SP_ID="${AZURE_SP_ID:-}"
AZURE_SP_SECRET=""  # Add your SP secret here

# Function Apps
DEV_FUNCTION_APP_NAME="$DEV_FUNCTION_APP_NAME"
DEV_RESOURCE_GROUP="$DEV_RESOURCE_GROUP"
QA_FUNCTION_APP_NAME="$QA_FUNCTION_APP_NAME"
QA_RESOURCE_GROUP="$QA_RESOURCE_GROUP"
PROD_FUNCTION_APP_NAME="$PROD_FUNCTION_APP_NAME"
PROD_RESOURCE_GROUP="$PROD_RESOURCE_GROUP"

# Approvers
QA_APPROVERS="${QA_APPROVERS:-}"
PROD_APPROVERS="${PROD_APPROVERS:-}"
EOF
        print_success "Configuration saved to $ENV_FILE"
        print_warning "Remember to add your GITHUB_PAT and AZURE_SP_SECRET to the file!"
    fi
}

# ============================================================================
# PRINT SUMMARY
# ============================================================================
print_summary() {
    echo ""
    echo "=============================================="
    echo -e "${GREEN}Setup Complete!${NC}"
    echo "=============================================="
    echo ""
    echo "Configuration:"
    echo "  Organization: $AZURE_DEVOPS_ORG"
    echo "  Project:      $AZURE_DEVOPS_PROJECT"
    echo "  Function App: ${DEV_FUNCTION_APP_NAME:-'(not configured)'}"
    echo ""
    echo "Next steps:"
    echo "  1. Add approvals to QA/Prod environments (see instructions above)"
    echo "  2. Ensure 'azure-pipelines.yml' exists in your GitHub repo"
    echo "  3. Push code changes to trigger the pipeline"
    echo ""
    echo "Links:"
    echo "  Pipeline:     $AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_build"
    echo "  Environments: $AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_environments"
    echo "  Variables:    $AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_library"
}

# ============================================================================
# MAIN
# ============================================================================
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto)
                AUTO_MODE="true"
                shift
                ;;
            --env)
                ENV_FILE="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                ;;
        esac
    done

    echo "=============================================="
    echo "Azure DevOps Setup for Mass Migration"
    echo "=============================================="

    # Check prerequisites first
    check_prerequisites

    # Load .env file if exists
    if ! load_env_file; then
        if [ "$AUTO_MODE" == "true" ]; then
            print_error "No .env file found. Create one from .env.example first."
            exit 1
        else
            print_info "No .env file found. Will prompt for values."
            # Set defaults for GitHub
            GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/phinestsoftware/rogers-mass-migration}"
            GITHUB_REPO_NAME="${GITHUB_REPO_NAME:-phinestsoftware/rogers-mass-migration}"
        fi
    fi

    # Auto-detect Azure configuration
    auto_detect_azure_config

    # Prompt for Azure DevOps org if not set
    if [ -z "$AZURE_DEVOPS_ORG" ]; then
        echo ""
        read -p "Enter Azure DevOps Organization URL (e.g., https://dev.azure.com/myorg): " AZURE_DEVOPS_ORG
    fi
    if [ -z "$AZURE_DEVOPS_PROJECT" ]; then
        read -p "Enter Azure DevOps Project name: " AZURE_DEVOPS_PROJECT
    fi

    # Validate required variables
    validate_env || exit 1

    # Detect function apps
    detect_function_apps

    # Prompt for secrets
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

    # Offer to save detected values
    save_detected_values

    # Print summary
    print_summary
}

# ============================================================================
# RUN
# ============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
