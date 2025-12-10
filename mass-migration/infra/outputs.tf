output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = module.storage.storage_account_name
}

output "storage_connection_string" {
  description = "Storage account connection string"
  value       = module.storage.storage_connection_string
  sensitive   = true
}

output "sql_server_name" {
  description = "Name of the SQL Server"
  value       = module.sql_database.server_name
}

output "sql_database_name" {
  description = "Name of the SQL Database"
  value       = module.sql_database.database_name
}

output "sql_connection_string" {
  description = "SQL Database connection string"
  value       = module.sql_database.connection_string
  sensitive   = true
}

output "function_app_name" {
  description = "Name of the Function App"
  value       = module.function_app.function_app_name
}

output "function_app_url" {
  description = "URL of the Function App"
  value       = module.function_app.function_app_url
}

output "application_insights_name" {
  description = "Name of Application Insights"
  value       = module.application_insights.name
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = module.application_insights.instrumentation_key
  sensitive   = true
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = module.key_vault.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = module.key_vault.uri
}

output "blob_containers" {
  description = "Created blob containers"
  value       = module.storage.container_names
}
