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

variable "tags" {
  type = map(string)
}

variable "storage_account_id" {
  type        = string
  description = "Storage account resource ID for Event Grid system topic"
}

# Event Grid System Topic for Storage Account
resource "azurerm_eventgrid_system_topic" "storage" {
  name                   = "evgt-${var.project_name}-${var.environment}-storage"
  resource_group_name    = var.resource_group_name
  location               = var.location
  source_arm_resource_id = var.storage_account_id
  topic_type             = "Microsoft.Storage.StorageAccounts"

  tags = var.tags
}

# Event Grid Subscription for billing-input (Storage Queue)
resource "azurerm_eventgrid_system_topic_event_subscription" "billing_input_queue" {
  name                = "billing-input-queue-subscription"
  system_topic        = azurerm_eventgrid_system_topic.storage.name
  resource_group_name = var.resource_group_name

  storage_queue_endpoint {
    storage_account_id = var.storage_account_id
    queue_name         = "file-upload-queue"
  }

  included_event_types = ["Microsoft.Storage.BlobCreated"]

  subject_filter {
    subject_begins_with = "/blobServices/default/containers/billing-input/"
  }

  retry_policy {
    max_delivery_attempts = 30
    event_time_to_live    = 1440 # 24 hours
  }
}

# Event Grid Subscription for mastercard-mapping (Storage Queue)
resource "azurerm_eventgrid_system_topic_event_subscription" "mc_response_queue" {
  name                = "mastercard-mapping-queue-subscription"
  system_topic        = azurerm_eventgrid_system_topic.storage.name
  resource_group_name = var.resource_group_name

  storage_queue_endpoint {
    storage_account_id = var.storage_account_id
    queue_name         = "file-upload-queue"
  }

  included_event_types = ["Microsoft.Storage.BlobCreated"]

  subject_filter {
    subject_begins_with = "/blobServices/default/containers/mastercard-mapping/"
  }

  retry_policy {
    max_delivery_attempts = 30
    event_time_to_live    = 1440 # 24 hours
  }
}

# Outputs
output "system_topic_id" {
  value = azurerm_eventgrid_system_topic.storage.id
}

output "system_topic_name" {
  value = azurerm_eventgrid_system_topic.storage.name
}
