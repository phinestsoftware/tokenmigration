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

variable "function_app_url" {
  type        = string
  description = "Function App URL for Event Grid webhook endpoint"
}

variable "function_app_key" {
  type        = string
  description = "Function App default key for authentication"
  sensitive   = true
}

variable "containers" {
  type        = list(string)
  description = "List of container names to create Event Grid subscriptions for"
  default     = ["billing-input", "mastercard-mapping"]
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

# Event Grid Subscriptions for each container
resource "azurerm_eventgrid_system_topic_event_subscription" "container" {
  for_each            = toset(var.containers)
  name                = "${each.value}-subscription"
  system_topic        = azurerm_eventgrid_system_topic.storage.name
  resource_group_name = var.resource_group_name

  webhook_endpoint {
    url = "${var.function_app_url}/api/upload/event-grid?code=${var.function_app_key}"
  }

  included_event_types = ["Microsoft.Storage.BlobCreated"]

  subject_filter {
    subject_begins_with = "/blobServices/default/containers/${each.value}/"
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

output "subscription_ids" {
  value = { for k, v in azurerm_eventgrid_system_topic_event_subscription.container : k => v.id }
}
