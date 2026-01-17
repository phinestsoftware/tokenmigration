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

variable "tags" {
  type = map(string)
}


# Storage Account
resource "azurerm_storage_account" "main" {
  name                     = "st${substr(var.project_name, 0, 8)}${var.resource_suffix}"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "prod" ? "GRS" : "LRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  tags = var.tags
}

# Blob Containers
resource "azurerm_storage_container" "billing_input" {
  name                  = "billing-input"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "billing_output" {
  name                  = "billing-output"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "mastercard_input" {
  name                  = "mastercard-input"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "mastercard_mapping" {
  name                  = "mastercard-mapping"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Format files container - for SQL BULK INSERT format files
# Separate from billing-input to avoid triggering Event Grid
resource "azurerm_storage_container" "format_files" {
  name                  = "format-files"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Storage Queues
resource "azurerm_storage_queue" "validate_tokens" {
  name                 = "validate-tokens-queue"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_queue" "create_batch" {
  name                 = "create-batch-queue"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_queue" "file_gen" {
  name                 = "file-gen-queue"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_queue" "batch_manager" {
  name                 = "batch-manager-queue"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_queue" "batch_worker" {
  name                 = "batch-worker-queue"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_queue" "billing_file" {
  name                 = "billing-file-queue"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_queue" "file_upload" {
  name                 = "file-upload-queue"
  storage_account_name = azurerm_storage_account.main.name
}

# Format file for BULK INSERT - Mastercard response (maps CSV columns to temp table with IDENTITY)
# Stored in format-files container to avoid triggering Event Grid
resource "azurerm_storage_blob" "mc_response_format_file" {
  name                   = "mc_response_temp.fmt"
  storage_account_name   = azurerm_storage_account.main.name
  storage_container_name = azurerm_storage_container.format_files.name
  type                   = "Block"
  source                 = "${path.module}/../../../format-files/mc_response_temp.fmt"
}

# Format file for BULK INSERT - Moneris input (maps CSV columns to temp table with IDENTITY)
# Stored in format-files container to avoid triggering Event Grid
resource "azurerm_storage_blob" "moneris_input_format_file" {
  name                   = "moneris_input_temp.fmt"
  storage_account_name   = azurerm_storage_account.main.name
  storage_container_name = azurerm_storage_container.format_files.name
  type                   = "Block"
  source                 = "${path.module}/../../../format-files/moneris_input_temp.fmt"
}


# Outputs
output "storage_account_name" {
  value = azurerm_storage_account.main.name
}

output "storage_account_primary_access_key" {
  value     = azurerm_storage_account.main.primary_access_key
  sensitive = true
}

output "storage_connection_string" {
  value     = azurerm_storage_account.main.primary_connection_string
  sensitive = true
}

output "container_names" {
  value = {
    billing_input     = azurerm_storage_container.billing_input.name
    billing_output    = azurerm_storage_container.billing_output.name
    mastercard_input  = azurerm_storage_container.mastercard_input.name
    mastercard_mapping = azurerm_storage_container.mastercard_mapping.name
  }
}

output "queue_names" {
  value = {
    validate_tokens = azurerm_storage_queue.validate_tokens.name
    create_batch    = azurerm_storage_queue.create_batch.name
    file_gen        = azurerm_storage_queue.file_gen.name
    batch_manager   = azurerm_storage_queue.batch_manager.name
    batch_worker    = azurerm_storage_queue.batch_worker.name
    billing_file    = azurerm_storage_queue.billing_file.name
    file_upload     = azurerm_storage_queue.file_upload.name
  }
}

output "storage_account_id" {
  value = azurerm_storage_account.main.id
}

