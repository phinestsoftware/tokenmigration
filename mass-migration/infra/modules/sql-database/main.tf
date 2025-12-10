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

variable "sql_admin_username" {
  type      = string
  sensitive = true
}

variable "sql_admin_password" {
  type      = string
  sensitive = true
}

variable "tags" {
  type = map(string)
}

# SQL Server
resource "azurerm_mssql_server" "main" {
  name                         = "sql-${var.project_name}-${var.environment}-${var.resource_suffix}"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"

  tags = var.tags
}

# SQL Database
resource "azurerm_mssql_database" "main" {
  name                 = "sqldb-${var.project_name}-${var.environment}"
  server_id            = azurerm_mssql_server.main.id
  collation            = "SQL_Latin1_General_CP1_CI_AS"
  max_size_gb          = var.environment == "prod" ? 50 : 10
  sku_name             = var.environment == "prod" ? "S2" : "S0"
  zone_redundant       = var.environment == "prod" ? true : false

  short_term_retention_policy {
    retention_days = var.environment == "prod" ? 35 : 7
  }

  tags = var.tags
}

# Allow Azure Services
resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Database Schema - executed via null_resource using Node.js
resource "null_resource" "database_schema" {
  depends_on = [azurerm_mssql_database.main, azurerm_mssql_firewall_rule.azure_services]

  triggers = {
    schema_hash = filemd5("${path.module}/../../scripts/schema.sql")
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/../.."
    command = <<-EOT
      node -e "
      const sql = require('mssql');
      const fs = require('fs');
      const config = {
        user: '${var.sql_admin_username}',
        password: '${var.sql_admin_password}',
        server: '${azurerm_mssql_server.main.fully_qualified_domain_name}',
        database: '${azurerm_mssql_database.main.name}',
        options: { encrypt: true, trustServerCertificate: false }
      };
      (async () => {
        const pool = await sql.connect(config);
        const schema = fs.readFileSync('scripts/schema.sql', 'utf8');
        const batches = schema.split(/\\nGO\\s*\\n/i).filter(b => b.trim());
        for (const batch of batches) {
          if (batch.trim()) {
            try { await pool.request().query(batch); }
            catch (e) { console.log('Batch error:', e.message); }
          }
        }
        console.log('Schema applied successfully');
        await pool.close();
      })();
      "
    EOT
  }
}

# Outputs
output "server_name" {
  value = azurerm_mssql_server.main.name
}

output "server_fqdn" {
  value = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "database_name" {
  value = azurerm_mssql_database.main.name
}

output "connection_string" {
  value     = "Server=tcp:${azurerm_mssql_server.main.fully_qualified_domain_name},1433;Initial Catalog=${azurerm_mssql_database.main.name};Persist Security Info=False;User ID=${var.sql_admin_username};Password=${var.sql_admin_password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  sensitive = true
}
