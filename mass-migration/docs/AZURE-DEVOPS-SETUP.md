# Azure DevOps Pipeline Setup Guide

This guide walks through setting up Azure DevOps CI/CD pipelines for the Mass Migration project. Follow these steps to configure pipelines for any Azure DevOps organization.

## Prerequisites

### 1. Required Tools

```bash
# Install Azure CLI
# macOS
brew install azure-cli

# Windows
winget install Microsoft.AzureCLI

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

```bash
# Install Azure DevOps CLI extension
az extension add --name azure-devops
```

### 2. Required Accounts & Access

| Requirement | Description |
|-------------|-------------|
| Azure Subscription | With Contributor access to deploy Function Apps |
| Azure DevOps Organization | Admin access to create projects, pipelines, service connections |
| GitHub Account | Access to the repository with admin:repo_hook permissions |

### 3. Required Tokens

You'll need to create two Personal Access Tokens (PATs):

#### GitHub PAT
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `admin:repo_hook` (Full control of repository hooks)
4. Copy the token (starts with `ghp_` or `github_pat_`)

#### Azure DevOps PAT
1. Go to `https://dev.azure.com/{YOUR_ORG}/_usersSettings/tokens`
2. Click "New Token"
3. Set expiration as needed
4. Select "Full access" or these specific scopes:
   - Build: Read & Execute
   - Code: Read
   - Environment: Read & Manage
   - Pipeline Resources: Use & Manage
   - Project and Team: Read, Write & Manage
   - Service Connections: Read, Query & Manage
   - Variable Groups: Read, Create & Manage
5. Copy the token

## Setup Methods

### Method 1: Automated Script (Recommended)

#### Step 1: Configure Environment

```bash
cd mass-migration/scripts

# Copy the example environment file
cp .env.example .env

# Edit with your values
nano .env  # or use any text editor
```

#### Step 2: Fill in .env Values

```bash
# ============================================================================
# GitHub Configuration
# ============================================================================
GITHUB_REPO_URL="https://github.com/YOUR_ORG/YOUR_REPO"
GITHUB_REPO_NAME="YOUR_ORG/YOUR_REPO"
GITHUB_SERVICE_CONNECTION_NAME="GitHub-MassMigration"
GITHUB_PAT="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============================================================================
# Azure DevOps Configuration
# ============================================================================
AZURE_DEVOPS_ORG="https://dev.azure.com/YOUR_ORG"
AZURE_DEVOPS_PROJECT="Your Project Name"
AZURE_DEVOPS_EXT_PAT="your-azure-devops-pat-here"

# ============================================================================
# Azure Subscription (leave empty to auto-detect from az login)
# ============================================================================
AZURE_SUBSCRIPTION_ID=""
AZURE_SUBSCRIPTION_NAME=""
AZURE_TENANT_ID=""

# ============================================================================
# Azure Service Principal (for pipeline deployments)
# ============================================================================
AZURE_SP_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AZURE_SP_SECRET="your-service-principal-secret"

# ============================================================================
# Function App Names (from Terraform output or Azure Portal)
# ============================================================================
DEV_FUNCTION_APP_NAME="func-tokenmigration-dev-xxxxx"
DEV_RESOURCE_GROUP="rg-tokenmigration-dev"

QA_FUNCTION_APP_NAME=""  # Leave empty if not deployed
QA_RESOURCE_GROUP="rg-tokenmigration-qa"

PROD_FUNCTION_APP_NAME=""  # Leave empty if not deployed
PROD_RESOURCE_GROUP="rg-tokenmigration-prod"

# ============================================================================
# Approvers (comma-separated emails for environment approvals)
# ============================================================================
QA_APPROVERS="qa-lead@company.com"
PROD_APPROVERS="prod-owner@company.com,security@company.com"

# ============================================================================
# Skip Steps (set to "true" to skip)
# ============================================================================
SKIP_PROJECT_CREATION="false"
SKIP_GITHUB_CONNECTION="false"
SKIP_AZURE_CONNECTIONS="false"
SKIP_VARIABLE_GROUP="false"
SKIP_ENVIRONMENTS="false"
SKIP_PIPELINE="false"
```

#### Step 3: Create Service Principal (if needed)

```bash
# Login to Azure
az login

# Create Service Principal with Contributor role
az ad sp create-for-rbac \
  --name "MassMigration-DevOps" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID

# Output will show:
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",      <- AZURE_SP_ID
#   "password": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",     <- AZURE_SP_SECRET
#   "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"      <- AZURE_TENANT_ID
# }
```

#### Step 4: Run the Setup Script

```bash
# Make script executable
chmod +x setup-azure-devops.sh

# Export the Azure DevOps PAT (required for CLI authentication)
export AZURE_DEVOPS_EXT_PAT="your-azure-devops-pat"

# Run in auto mode (non-interactive)
./setup-azure-devops.sh --auto

# Or run interactively
./setup-azure-devops.sh
```

### Method 2: Manual Setup via Azure CLI

If you prefer manual control or the script fails, follow these steps:

#### Step 1: Login and Set Defaults

```bash
# Login to Azure
az login

# Set Azure DevOps PAT
export AZURE_DEVOPS_EXT_PAT="your-azure-devops-pat"

# Set defaults
az devops configure --defaults \
  organization=https://dev.azure.com/YOUR_ORG \
  project="Your Project Name"
```

#### Step 2: Create Project (if needed)

```bash
az devops project create \
  --name "Your Project Name" \
  --description "Mass Migration Token Processing" \
  --visibility private
```

#### Step 3: Create GitHub Service Connection

```bash
az devops service-endpoint github create \
  --name "GitHub-MassMigration" \
  --github-url "https://github.com/YOUR_ORG/YOUR_REPO" \
  --authorization-scheme PersonalAccessToken \
  --org https://dev.azure.com/YOUR_ORG \
  --project "Your Project Name"

# When prompted, enter your GitHub PAT
```

#### Step 4: Create Azure Service Connection

```bash
# For each environment (dev, qa, prod)
az devops service-endpoint azurerm create \
  --name "Azure-MassMigration-Dev" \
  --azure-rm-service-principal-id "YOUR_SP_APP_ID" \
  --azure-rm-subscription-id "YOUR_SUBSCRIPTION_ID" \
  --azure-rm-subscription-name "Your Subscription Name" \
  --azure-rm-tenant-id "YOUR_TENANT_ID" \
  --org https://dev.azure.com/YOUR_ORG \
  --project "Your Project Name"

# When prompted, enter the Service Principal secret
```

#### Step 5: Create Variable Group

```bash
az pipelines variable-group create \
  --name "MassMigration-Variables" \
  --authorize true \
  --variables \
    DEV_FUNCTION_APP_NAME="func-tokenmigration-dev-xxxxx" \
    DEV_RESOURCE_GROUP="rg-tokenmigration-dev" \
    QA_FUNCTION_APP_NAME="" \
    QA_RESOURCE_GROUP="rg-tokenmigration-qa" \
    PROD_FUNCTION_APP_NAME="" \
    PROD_RESOURCE_GROUP="rg-tokenmigration-prod" \
  --org https://dev.azure.com/YOUR_ORG \
  --project "Your Project Name"
```

#### Step 6: Create Pipeline

```bash
# Get the GitHub service connection ID
GITHUB_SC_ID=$(az devops service-endpoint list \
  --query "[?name=='GitHub-MassMigration'].id" -o tsv)

# Create the pipeline
az pipelines create \
  --name "Mass-Migration-CI-CD" \
  --repository "YOUR_ORG/YOUR_REPO" \
  --repository-type github \
  --branch main \
  --yml-path "azure-pipelines.yml" \
  --service-connection "$GITHUB_SC_ID" \
  --skip-first-run true \
  --org https://dev.azure.com/YOUR_ORG \
  --project "Your Project Name"
```

### Method 3: Manual Setup via Azure DevOps Portal

#### Step 1: Create Project
1. Go to https://dev.azure.com/YOUR_ORG
2. Click "New Project"
3. Enter project name and description
4. Set visibility to Private
5. Click "Create"

#### Step 2: Create GitHub Service Connection
1. Go to Project Settings > Service connections
2. Click "New service connection"
3. Select "GitHub"
4. Choose "Personal Access Token"
5. Enter your GitHub PAT
6. Name it "GitHub-MassMigration"
7. Check "Grant access permission to all pipelines"
8. Click "Save"

#### Step 3: Create Azure Service Connection
1. Go to Project Settings > Service connections
2. Click "New service connection"
3. Select "Azure Resource Manager"
4. Choose "Service principal (manual)"
5. Enter:
   - Subscription ID
   - Subscription Name
   - Service Principal ID (App ID)
   - Service Principal Key (Secret)
   - Tenant ID
6. Name it "Azure-MassMigration-Dev"
7. Check "Grant access permission to all pipelines"
8. Click "Verify and save"

#### Step 4: Create Variable Group
1. Go to Pipelines > Library
2. Click "+ Variable group"
3. Name it "MassMigration-Variables"
4. Add variables:
   - `DEV_FUNCTION_APP_NAME`: your dev function app name
   - `DEV_RESOURCE_GROUP`: rg-tokenmigration-dev
   - `QA_FUNCTION_APP_NAME`: (leave empty if not deployed)
   - `QA_RESOURCE_GROUP`: rg-tokenmigration-qa
   - `PROD_FUNCTION_APP_NAME`: (leave empty if not deployed)
   - `PROD_RESOURCE_GROUP`: rg-tokenmigration-prod
5. Click "Save"

#### Step 5: Create Pipeline
1. Go to Pipelines > Pipelines
2. Click "New pipeline"
3. Select "GitHub"
4. Authorize and select your repository
5. Select "Existing Azure Pipelines YAML file"
6. Choose `/azure-pipelines.yml`
7. Click "Continue" then "Save" (or "Run" to test)

#### Step 6: Configure Environments (Optional)
1. Go to Pipelines > Environments
2. Create environments: dev, qa, prod
3. For qa and prod, add approval checks:
   - Click on environment > "..." > "Approvals and checks"
   - Add "Approvals"
   - Add approver emails

## Verification

After setup, verify everything is configured correctly:

### Check Service Connections
```bash
az devops service-endpoint list \
  --org https://dev.azure.com/YOUR_ORG \
  --project "Your Project Name" \
  -o table
```

Expected output:
```
Name                      Type      Is Ready
------------------------  --------  ----------
GitHub-MassMigration      github    True
Azure-MassMigration-Dev   azurerm   True
```

### Check Variable Group
```bash
az pipelines variable-group list \
  --org https://dev.azure.com/YOUR_ORG \
  --project "Your Project Name" \
  -o table
```

### Check Pipeline
```bash
az pipelines list \
  --org https://dev.azure.com/YOUR_ORG \
  --project "Your Project Name" \
  -o table
```

### Test Pipeline Run
```bash
az pipelines run \
  --name "Mass-Migration-CI-CD" \
  --org https://dev.azure.com/YOUR_ORG \
  --project "Your Project Name"
```

## Troubleshooting

### Error: "Not authorized to access this resource"
- Ensure your Azure DevOps PAT has the correct scopes
- Verify you have admin access to the organization
- Check that the PAT hasn't expired

### Error: "Service principal not found"
- Verify the Service Principal exists: `az ad sp show --id YOUR_SP_ID`
- Check the Service Principal has Contributor role on the subscription
- Ensure the secret hasn't expired

### Error: "Repository not found"
- Verify the GitHub PAT has `repo` scope
- Check the repository URL is correct
- Ensure the GitHub account has access to the repository

### Error: "Pipeline YAML file not found"
- Verify `azure-pipelines.yml` exists in the repository root
- Check the file path in the pipeline configuration
- Ensure the file is committed and pushed to the main branch

### Pipeline runs but deployment fails
- Check the Azure service connection is verified and working
- Verify the Function App name matches what's in Azure
- Check the Service Principal has permissions on the resource group

## Quick Reference

### Important URLs
| Resource | URL Pattern |
|----------|-------------|
| DevOps Org | `https://dev.azure.com/{ORG}` |
| Project | `https://dev.azure.com/{ORG}/{PROJECT}` |
| Pipelines | `https://dev.azure.com/{ORG}/{PROJECT}/_build` |
| Service Connections | `https://dev.azure.com/{ORG}/{PROJECT}/_settings/adminservices` |
| Variable Groups | `https://dev.azure.com/{ORG}/{PROJECT}/_library` |
| Environments | `https://dev.azure.com/{ORG}/{PROJECT}/_environments` |
| PAT Settings | `https://dev.azure.com/{ORG}/_usersSettings/tokens` |

### CLI Quick Commands
```bash
# List projects
az devops project list --org https://dev.azure.com/YOUR_ORG -o table

# List service connections
az devops service-endpoint list -o table

# List pipelines
az pipelines list -o table

# List variable groups
az pipelines variable-group list -o table

# Run a pipeline
az pipelines run --name "Pipeline-Name"

# Show pipeline run status
az pipelines runs list --pipeline-name "Pipeline-Name" -o table
```

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/.env.example` | Template for environment configuration |
| `scripts/.env` | Your local configuration (gitignored) |
| `scripts/setup-azure-devops.sh` | Automated setup script |
| `azure-pipelines.yml` | Pipeline definition |
| `docs/AZURE-DEVOPS-SETUP.md` | This guide |

## Adding QA and Production Stages

The default pipeline (`azure-pipelines.yml`) only deploys to the Dev environment. For customer deployments, you'll need to add QA and Production stages.

### Prerequisites for Additional Stages

Before adding new stages, ensure you have:

1. **Deployed Infrastructure** for each environment:
   ```bash
   # Deploy QA infrastructure
   cd infra
   cp terraform.tfvars terraform-qa.tfvars
   # Edit terraform-qa.tfvars: set environment = "qa"
   terraform workspace new qa
   terraform apply -var-file=terraform-qa.tfvars

   # Deploy Prod infrastructure
   cp terraform.tfvars terraform-prod.tfvars
   # Edit terraform-prod.tfvars: set environment = "prod"
   terraform workspace new prod
   terraform apply -var-file=terraform-prod.tfvars
   ```

2. **Azure Service Connections** for each environment:
   ```bash
   # Create QA service connection
   az devops service-endpoint azurerm create \
     --name "Azure-MassMigration-QA" \
     --azure-rm-service-principal-id "YOUR_SP_ID" \
     --azure-rm-subscription-id "YOUR_QA_SUBSCRIPTION_ID" \
     --azure-rm-subscription-name "Your QA Subscription" \
     --azure-rm-tenant-id "YOUR_TENANT_ID"

   # Create Prod service connection
   az devops service-endpoint azurerm create \
     --name "Azure-MassMigration-Prod" \
     --azure-rm-service-principal-id "YOUR_SP_ID" \
     --azure-rm-subscription-id "YOUR_PROD_SUBSCRIPTION_ID" \
     --azure-rm-subscription-name "Your Prod Subscription" \
     --azure-rm-tenant-id "YOUR_TENANT_ID"
   ```

3. **Updated Variable Group** with QA/Prod function app names:
   ```bash
   az pipelines variable-group variable update \
     --group-id YOUR_GROUP_ID \
     --name qaFunctionAppName \
     --value "func-tokenmigration-qa-xxxxx"

   az pipelines variable-group variable update \
     --group-id YOUR_GROUP_ID \
     --name prodFunctionAppName \
     --value "func-tokenmigration-prod-xxxxx"
   ```

### Adding QA Stage to Pipeline

Add this stage after the `DeployDev` stage in `azure-pipelines.yml`:

```yaml
  # ============================================
  # DEPLOY TO QA (with approval)
  # ============================================
  - stage: DeployQA
    displayName: 'Deploy to QA'
    dependsOn: DeployDev
    condition: succeeded()

    jobs:
      - deployment: DeployToQA
        displayName: 'Deploy to QA Function App'
        environment: 'mass-migration-qa'  # Create this environment in Azure DevOps
        pool:
          vmImage: 'ubuntu-latest'

        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: function-app

                - task: AzureFunctionApp@2
                  displayName: 'Deploy Azure Function'
                  inputs:
                    connectedServiceNameARM: 'Azure-MassMigration-QA'
                    appType: 'functionAppLinux'
                    appName: '$(qaFunctionAppName)'
                    package: '$(Pipeline.Workspace)/function-app/$(Build.BuildId).zip'
                    runtimeStack: 'NODE|20'
                    deploymentMethod: 'zipDeploy'
```

### Adding Production Stage to Pipeline

Add this stage after the `DeployQA` stage:

```yaml
  # ============================================
  # DEPLOY TO PROD (with approval)
  # ============================================
  - stage: DeployProd
    displayName: 'Deploy to Prod'
    dependsOn: DeployQA
    condition: succeeded()

    jobs:
      - deployment: DeployToProd
        displayName: 'Deploy to Prod Function App'
        environment: 'mass-migration-prod'  # Create this environment in Azure DevOps
        pool:
          vmImage: 'ubuntu-latest'

        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: function-app

                - task: AzureFunctionApp@2
                  displayName: 'Deploy Azure Function'
                  inputs:
                    connectedServiceNameARM: 'Azure-MassMigration-Prod'
                    appType: 'functionAppLinux'
                    appName: '$(prodFunctionAppName)'
                    package: '$(Pipeline.Workspace)/function-app/$(Build.BuildId).zip'
                    runtimeStack: 'NODE|20'
                    deploymentMethod: 'zipDeploy'
```

### Setting Up Approval Gates

For QA and Production environments, you should configure approval gates:

1. Go to **Pipelines > Environments** in Azure DevOps
2. Click on `mass-migration-qa` or `mass-migration-prod`
3. Click **...** (more options) > **Approvals and checks**
4. Click **+** > **Approvals**
5. Add approvers (email addresses)
6. Configure options:
   - **Timeout**: How long to wait for approval (e.g., 72 hours)
   - **Instructions**: Message shown to approvers
7. Click **Create**

### Environment-Specific Configurations

If QA/Prod need different configurations, you can:

1. **Use separate variable groups**:
   ```yaml
   variables:
     - ${{ if eq(variables['Build.SourceBranch'], 'refs/heads/main') }}:
       - group: MassMigration-Variables-Prod
     - ${{ if ne(variables['Build.SourceBranch'], 'refs/heads/main') }}:
       - group: MassMigration-Variables-Dev
   ```

2. **Use stage-specific variables**:
   ```yaml
   - stage: DeployProd
     variables:
       sqlConnectionString: $(prodSqlConnectionString)
   ```

### Service Connections Summary

| Environment | Service Connection Name | Purpose |
|-------------|------------------------|---------|
| All | `GitHub-MassMigration` | Pull code from GitHub |
| Dev | `Azure-MassMigration-Dev` | Deploy to Dev Azure resources |
| QA | `Azure-MassMigration-QA` | Deploy to QA Azure resources |
| Prod | `Azure-MassMigration-Prod` | Deploy to Prod Azure resources |

**Note**: Each Azure service connection should use a Service Principal with appropriate permissions for that environment. For production, consider using a separate Service Principal with stricter access controls.

## Support

If you encounter issues not covered in this guide:
1. Check Azure DevOps documentation: https://docs.microsoft.com/en-us/azure/devops/
2. Check Azure CLI documentation: https://docs.microsoft.com/en-us/cli/azure/
3. Review pipeline logs in Azure DevOps portal
