variable "name_prefix" {
  type        = string
  description = "Prefix for ECR repository names"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "repository_names" {
  type        = list(string)
  description = "List of repository names to create"
}

variable "tags" {
  type        = map(string)
  description = "Additional tags"
  default     = {}
}