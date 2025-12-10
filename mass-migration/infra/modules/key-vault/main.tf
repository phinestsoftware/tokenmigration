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

variable "function_app_identity_id" {
  type = string
}

variable "sql_connection_string" {
  type      = string
  sensitive = true
}

variable "storage_connection_string" {
  type      = string
  sensitive = true
}

variable "tags" {
  type = map(string)
}

data "azurerm_client_config" "current" {}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                        = "kv${substr(var.project_name, 0, 8)}${var.resource_suffix}"
  resource_group_name         = var.resource_group_name
  location                    = var.location
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 7
  purge_protection_enabled    = var.environment == "prod" ? true : false
  enable_rbac_authorization   = true

  tags = var.tags
}

# RBAC for Function App to access Key Vault
resource "azurerm_role_assignment" "function_app_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.function_app_identity_id
}

# RBAC for current user (for deployment)
resource "azurerm_role_assignment" "deployer_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Store SQL Connection String
resource "azurerm_key_vault_secret" "sql_connection" {
  name         = "sql-connection-string"
  value        = var.sql_connection_string
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.deployer_secrets]
}

# Store Storage Connection String
resource "azurerm_key_vault_secret" "storage_connection" {
  name         = "storage-connection-string"
  value        = var.storage_connection_string
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.deployer_secrets]
}

# Outputs
output "name" {
  value = azurerm_key_vault.main.name
}

output "uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "id" {
  value = azurerm_key_vault.main.id
}
