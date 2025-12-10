# Example Terraform Variables
# Copy this file to terraform.tfvars and update values

project_name = "tokenmigration"
environment  = "dev"
location     = "canadacentral"

# SQL Server credentials (use secrets management in production)
sql_admin_username = "sqladmin"
sql_admin_password = "YourSecurePassword123!"

# Optional: Restrict SQL access to specific IPs
allowed_ip_addresses = [
  # "YOUR_IP_ADDRESS/32"
]

# Function App SKU
# Y1 = Consumption (serverless, pay per execution)
# EP1/EP2/EP3 = Premium (always warm, better performance)
function_app_sku = "Y1"

# SQL Database SKU
# Basic: B
# Standard: S0, S1, S2, S3, S4, S6, S7, S9, S12
# Premium: P1, P2, P4, P6, P11, P15
sql_database_sku         = "S0"
sql_database_max_size_gb = 10
