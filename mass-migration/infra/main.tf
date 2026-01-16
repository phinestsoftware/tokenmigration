terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 1.12.0"
    }
  }

  # backend "azurerm" {
  #   # Configure in backend.tfvars or via CLI
  #   # resource_group_name  = "tfstate-rg"
  #   # storage_account_name = "tfstatestorage"
  #   # container_name       = "tfstate"
  #   # key                  = "mass-migration.tfstate"
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
  }
  subscription_id             = "23269dfd-5ac9-404c-9964-bfd306b07b6b"
  resource_provider_registrations = "none"
}

provider "azapi" {
}

# Random suffix for globally unique names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  resource_suffix = random_string.suffix.result
  common_tags = {
    Project     = "PaymentTokenMigration"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project_name}-${var.environment}"
  location = var.location
  tags     = local.common_tags
}

# Storage Account Module
module "storage" {
  source = "./modules/storage"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = var.environment
  project_name        = var.project_name
  resource_suffix     = local.resource_suffix
  tags                = local.common_tags
}

# SQL Database Module
module "sql_database" {
  source = "./modules/sql-database"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = var.environment
  project_name        = var.project_name
  resource_suffix     = local.resource_suffix
  sql_admin_username  = var.sql_admin_username
  sql_admin_password  = var.sql_admin_password
  tags                = local.common_tags
}

# Function App Module
module "function_app" {
  source = "./modules/function-app"

  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  environment                  = var.environment
  project_name                 = var.project_name
  resource_suffix              = local.resource_suffix
  storage_account_name         = module.storage.storage_account_name
  storage_account_access_key   = module.storage.storage_account_primary_access_key
  storage_connection_string    = module.storage.storage_connection_string
  sql_connection_string        = module.sql_database.connection_string
  sql_server_fqdn              = module.sql_database.server_fqdn
  sql_database_name            = module.sql_database.database_name
  sql_admin_username           = var.sql_admin_username
  sql_admin_password           = var.sql_admin_password
  application_insights_key     = module.application_insights.instrumentation_key
  application_insights_conn_str = module.application_insights.connection_string
  acs_connection_string        = module.communication_services.primary_connection_string
  email_from_address           = module.communication_services.email_from_address
  email_to_address             = var.email_to
  # Dynatrace OpenTelemetry Integration
  dynatrace_enabled            = var.dynatrace_enabled
  dt_api_url                   = var.dt_api_url
  dt_api_token_secret_uri      = module.key_vault.dt_api_token_secret_uri
  tags                         = local.common_tags
}

# Application Insights
module "application_insights" {
  source = "./modules/application-insights"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = var.environment
  project_name        = var.project_name
  tags                = local.common_tags
}

# Key Vault Module
module "key_vault" {
  source = "./modules/key-vault"

  resource_group_name  = azurerm_resource_group.main.name
  location             = azurerm_resource_group.main.location
  environment          = var.environment
  project_name         = var.project_name
  resource_suffix      = local.resource_suffix
  function_app_identity_id = module.function_app.identity_principal_id
  sql_connection_string = module.sql_database.connection_string
  storage_connection_string = module.storage.storage_connection_string
  dt_api_token         = var.dt_api_token
  tags                 = local.common_tags
}

# Communication Services Module
module "communication_services" {
  source = "./modules/communication-services"

  resource_group_name = azurerm_resource_group.main.name
  environment         = var.environment
  project_name        = var.project_name
  resource_suffix     = local.resource_suffix
  tags                = local.common_tags
}

# Get Function App keys for Event Grid webhook authentication
data "azurerm_function_app_host_keys" "main" {
  name                = module.function_app.function_app_name
  resource_group_name = azurerm_resource_group.main.name
}

# Event Grid Module (for large file processing via HTTP trigger)
# This module depends on both storage and function_app, avoiding circular dependency
module "event_grid" {
  source = "./modules/event-grid"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = var.environment
  project_name        = var.project_name
  storage_account_id  = module.storage.storage_account_id
  function_app_url    = module.function_app.function_app_url
  function_app_key    = data.azurerm_function_app_host_keys.main.default_function_key
  containers          = ["billing-input", "mastercard-mapping"]
  tags                = local.common_tags
}
