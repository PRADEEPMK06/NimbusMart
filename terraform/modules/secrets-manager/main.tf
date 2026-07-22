# terraform/modules/secrets-manager/main.tf
# Secrets Manager module for the deployment platform

locals {
  name = var.secret_name
  tags = merge(var.tags, {
    Name        = local.name
    Environment = var.environment
    ManagedBy   = "Terraform"
  })
}

# ── Secret ────────────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = local.name
  description = "Database credentials for ${var.environment} environment"

  tags = local.tags
}

# ── Secret Version ────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = var.db_host
    port     = var.db_port
    dbname   = var.db_name
  })
}