variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "environment" {
  type = string
}

variable "project_name" {
  type = string
}

variable "resource_suffix" {
  type = string
}

variable "storage_account_name" {
  type = string
}

variable "storage_account_access_key" {
  type      = string
  sensitive = true
}

variable "storage_connection_string" {
  type      = string
  sensitive = true
}

variable "sql_connection_string" {
  type      = string
  sensitive = true
}

variable "sql_server_fqdn" {
  type = string
}

variable "sql_database_name" {
  type = string
}

variable "sql_admin_username" {
  type      = string
  sensitive = true
}

variable "sql_admin_password" {
  type      = string
  sensitive = true
}

variable "application_insights_key" {
  type      = string
  sensitive = true
}

variable "application_insights_conn_str" {
  type      = string
  sensitive = true
}

variable "tags" {
  type = map(string)
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "asp-${var.project_name}-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = var.environment == "prod" ? "EP1" : "Y1"

  tags = var.tags
}

# Function App
resource "azurerm_linux_function_app" "main" {
  name                = "func-${var.project_name}-${var.environment}-${var.resource_suffix}"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  storage_account_name       = var.storage_account_name
  storage_account_access_key = var.storage_account_access_key

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      node_version = "18"
    }

    cors {
      allowed_origins = ["https://portal.azure.com"]
    }

    application_insights_key               = var.application_insights_key
    application_insights_connection_string = var.application_insights_conn_str
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = "node"
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~20"
    "WEBSITE_RUN_FROM_PACKAGE"       = "1"

    # Storage
    "STORAGE_CONNECTION_STRING"      = var.storage_connection_string
    "BILLING_INPUT_CONTAINER"        = "billing-input"
    "BILLING_OUTPUT_CONTAINER"       = "billing-output"
    "MASTERCARD_INPUT_CONTAINER"     = "mastercard-input"
    "MASTERCARD_MAPPING_CONTAINER"   = "mastercard-mapping"

    # Queues
    "VALIDATE_QUEUE"                 = "validate-tokens-queue"
    "CREATE_BATCH_QUEUE"             = "create-batch-queue"
    "FILE_GEN_QUEUE"                 = "file-gen-queue"
    "BATCH_MANAGER_QUEUE"            = "batch-manager-queue"
    "BATCH_WORKER_QUEUE"             = "batch-worker-queue"
    "BILLING_FILE_QUEUE"             = "billing-file-queue"

    # Database - Individual settings required by the app
    "SQL_SERVER"                     = var.sql_server_fqdn
    "SQL_DATABASE"                   = var.sql_database_name
    "SQL_USER"                       = var.sql_admin_username
    "SQL_PASSWORD"                   = var.sql_admin_password
    "SQL_ENCRYPT"                    = "true"
    "SQL_TRUST_SERVER_CERTIFICATE"   = "false"

    # Database - Connection string (for reference)
    "SQL_CONNECTION_STRING"          = var.sql_connection_string

    # Migration Settings
    "DEFAULT_BATCH_SIZE"             = "1000"
    "FAILURE_THRESHOLD_PERCENT"      = "50"
    "MAX_ACTIVE_WORKERS"             = "10"

    # Features
    "MOCK_MASTERCARD_ENABLED"        = var.environment != "prod" ? "true" : "false"
    "EMAIL_ENABLED"                  = var.environment == "prod" ? "true" : "false"
  }

  tags = var.tags
}

# Outputs
output "function_app_name" {
  value = azurerm_linux_function_app.main.name
}

output "function_app_url" {
  value = "https://${azurerm_linux_function_app.main.default_hostname}"
}

output "identity_principal_id" {
  value = azurerm_linux_function_app.main.identity[0].principal_id
}

output "identity_tenant_id" {
  value = azurerm_linux_function_app.main.identity[0].tenant_id
}
