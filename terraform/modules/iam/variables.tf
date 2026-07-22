variable "cluster_name" {
  type        = string
  description = "EKS cluster name"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "oidc_provider_arn" {
  type        = string
  description = "ARN of the OIDC provider for IRSA"
}

variable "oidc_provider_url" {
  type        = string
  description = "URL of the OIDC provider for IRSA"
}

variable "namespace" {
  type        = string
  description = "Kubernetes namespace"
  default     = "ecommerce"
}

variable "db_secret_arn" {
  type        = string
  description = "ARN of the database secret in Secrets Manager"
}

variable "tags" {
  type        = map(string)
  description = "Additional tags"
  default     = {}
}