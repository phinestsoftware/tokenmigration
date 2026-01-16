variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "tokenmigration"
}

variable "environment" {
  description = "Environment (dev, qa, pet, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "qa", "pet", "prod"], var.environment)
    error_message = "Environment must be one of: dev, qa, pet, prod."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "canadacentral"
}

variable "sql_admin_username" {
  description = "SQL Server administrator username"
  type        = string
  sensitive   = true
}

variable "sql_admin_password" {
  description = "SQL Server administrator password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.sql_admin_password) >= 12
    error_message = "SQL admin password must be at least 12 characters."
  }
}

variable "allowed_ip_addresses" {
  description = "List of IP addresses allowed to access SQL Server"
  type        = list(string)
  default     = []
}

variable "function_app_sku" {
  description = "SKU for the Function App service plan"
  type        = string
  default     = "Y1" # Consumption plan

  validation {
    condition     = contains(["Y1", "EP1", "EP2", "EP3"], var.function_app_sku)
    error_message = "Function app SKU must be Y1 (Consumption) or EP1/EP2/EP3 (Premium)."
  }
}

variable "sql_database_sku" {
  description = "SKU for SQL Database"
  type        = string
  default     = "S0"
}

variable "sql_database_max_size_gb" {
  description = "Maximum size of SQL Database in GB"
  type        = number
  default     = 10
}

variable "email_from" {
  description = "Sender email address for notifications"
  type        = string
  default     = "lamba.tajinder@gmail.com"
}

variable "email_to" {
  description = "Recipient email addresses for notifications (comma-separated)"
  type        = string
  default     = "lamba.tajinder@gmail.com,neeraj.kumar@digitalsarthi.ca,vrushali@digitalsarthi.com"
}

# Dynatrace OpenTelemetry Integration
variable "dynatrace_enabled" {
  description = "Enable Dynatrace OpenTelemetry tracing (true/false)"
  type        = string
  default     = "false"
}

variable "dt_api_url" {
  description = "Dynatrace API URL for OTLP ingest (e.g., https://{env-id}.live.dynatrace.com/api/v2/otlp)"
  type        = string
  default     = ""
}

variable "dt_api_token" {
  description = "Dynatrace API token with OpenTelemetry ingest scope"
  type        = string
  sensitive   = true
  default     = ""
}

