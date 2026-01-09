variable "resource_group_name" {
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

resource "azurerm_email_communication_service" "main" {
  name                = "email-${var.project_name}-${var.environment}-${var.resource_suffix}"
  resource_group_name = var.resource_group_name
  data_location       = "United States"
  tags                = var.tags
}

resource "azurerm_email_communication_service_domain" "main" {
  name             = "AzureManagedDomain"
  email_service_id = azurerm_email_communication_service.main.id

  domain_management = "AzureManaged"
}

resource "azurerm_communication_service" "main" {
  name                = "acs-${var.project_name}-${var.environment}-${var.resource_suffix}"
  resource_group_name = var.resource_group_name
  data_location       = "United States"
  tags                = var.tags
}

# Link email domain to communication service using Azure CLI
resource "null_resource" "link_email_domain" {
  depends_on = [
    azurerm_communication_service.main,
    azurerm_email_communication_service_domain.main
  ]

  triggers = {
    communication_service_id = azurerm_communication_service.main.id
    email_domain_id          = azurerm_email_communication_service_domain.main.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      az communication update \
        --name ${azurerm_communication_service.main.name} \
        --resource-group ${var.resource_group_name} \
        --linked-domains ${azurerm_email_communication_service_domain.main.id}
    EOT
  }
}

# Outputs
output "connection_string" {
  value     = azurerm_communication_service.main.primary_connection_string
  sensitive = true
}

output "primary_connection_string" {
  value     = azurerm_communication_service.main.primary_connection_string
  sensitive = true
}

output "email_from_address" {
  value = "DoNotReply@${azurerm_email_communication_service_domain.main.from_sender_domain}"
}

output "communication_service_id" {
  value = azurerm_communication_service.main.id
}

output "email_service_id" {
  value = azurerm_email_communication_service.main.id
}
