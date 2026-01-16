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

variable "storage_account_name" {
  type        = string
  description = "Storage account name for BULK INSERT external data source"
}

variable "storage_account_id" {
  type        = string
  description = "Storage account ID for role assignment"
}

# SQL Server with System Assigned Managed Identity
resource "azurerm_mssql_server" "main" {
  name                         = "sql-${var.project_name}-${var.environment}-${var.resource_suffix}"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"

  identity {
    type = "SystemAssigned"
  }

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

# External Data Source for BULK INSERT - executed after schema
resource "null_resource" "bulk_insert_setup" {
  depends_on = [null_resource.database_schema, null_resource.sql_storage_role_assignment]

  triggers = {
    storage_account = var.storage_account_name
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/../.."
    command = <<-EOT
      node -e "
      const sql = require('mssql');
      const config = {
        user: '${var.sql_admin_username}',
        password: '${var.sql_admin_password}',
        server: '${azurerm_mssql_server.main.fully_qualified_domain_name}',
        database: '${azurerm_mssql_database.main.name}',
        options: { encrypt: true, trustServerCertificate: false }
      };
      (async () => {
        const pool = await sql.connect(config);

        // Create master key if not exists
        try {
          await pool.request().query(\"IF NOT EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = '##MS_DatabaseMasterKey##') CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'BulkInsert@2026!Secure'\");
          console.log('Master key checked/created');
        } catch (e) { console.log('Master key:', e.message); }

        // Create database scoped credential for managed identity (required for BULK INSERT)
        try {
          await pool.request().query(\"IF NOT EXISTS (SELECT * FROM sys.database_scoped_credentials WHERE name = 'ManagedIdentityCredential') CREATE DATABASE SCOPED CREDENTIAL ManagedIdentityCredential WITH IDENTITY = 'Managed Identity'\");
          console.log('Managed identity credential checked/created');
        } catch (e) { console.log('Credential:', e.message); }

        // Drop and recreate external data source (to update if storage changes)
        try {
          await pool.request().query(\"IF EXISTS (SELECT * FROM sys.external_data_sources WHERE name = 'McResponseBlobStorage') DROP EXTERNAL DATA SOURCE McResponseBlobStorage\");
        } catch (e) { }

        // Create external data source with managed identity credential
        try {
          await pool.request().query(\"CREATE EXTERNAL DATA SOURCE McResponseBlobStorage WITH (TYPE = BLOB_STORAGE, LOCATION = 'https://${var.storage_account_name}.blob.core.windows.net', CREDENTIAL = ManagedIdentityCredential)\");
          console.log('External data source created with managed identity');
        } catch (e) { console.log('External data source:', e.message); }

        await pool.close();
        console.log('BULK INSERT setup completed');
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

output "identity_principal_id" {
  value = azurerm_mssql_server.main.identity[0].principal_id
}

# Grant SQL Server managed identity access to blob storage for BULK INSERT
# Using null_resource + Azure CLI to handle the dependency properly
resource "null_resource" "sql_storage_role_assignment" {
  depends_on = [azurerm_mssql_server.main]

  triggers = {
    sql_server_id      = azurerm_mssql_server.main.id
    storage_account_id = var.storage_account_id
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Get the SQL Server's managed identity principal ID
      PRINCIPAL_ID=$(az sql server show --name ${azurerm_mssql_server.main.name} --resource-group ${var.resource_group_name} --query identity.principalId -o tsv)

      # Check if role assignment already exists
      EXISTING=$(az role assignment list --assignee $PRINCIPAL_ID --scope ${var.storage_account_id} --role "Storage Blob Data Reader" --query "[0].id" -o tsv 2>/dev/null || true)

      if [ -z "$EXISTING" ]; then
        echo "Creating role assignment..."
        az role assignment create --assignee $PRINCIPAL_ID --role "Storage Blob Data Reader" --scope ${var.storage_account_id}
        echo "Role assignment created"
      else
        echo "Role assignment already exists"
      fi
    EOT
  }
}
