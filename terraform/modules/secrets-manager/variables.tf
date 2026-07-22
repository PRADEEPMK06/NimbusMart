variable "secret_name" {
  type        = string
  description = "Name of the secret in AWS Secrets Manager"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "db_username" {
  type        = string
  description = "Database username"
}

variable "db_password" {
  type        = string
  description = "Database password"
  sensitive   = true
}

variable "db_host" {
  type        = string
  description = "Database host"
}

variable "db_port" {
  type        = string
  description = "Database port"
  default     = "5432"
}

variable "db_name" {
  type        = string
  description = "Database name"
}

variable "tags" {
  type        = map(string)
  description = "Additional tags"
  default     = {}
}