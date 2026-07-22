output "secret_name" {
  description = "Name of the secret"
  value       = aws_secretsmanager_secret.db_credentials.name
}

output "secret_arn" {
  description = "ARN of the secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "secret_version" {
  description = "ARN of the secret version"
  value       = aws_secretsmanager_secret_version.db_credentials.arn
}