variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "main"
}

variable "project_name" {
  type        = string
  description = "Project name"
  default     = "nimbusmart"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones"
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version"
  default     = "1.30"
}

variable "node_instance_type" {
  type        = string
  description = "EC2 instance type for EKS nodes"
  default     = "t3.medium"
}

variable "node_desired" {
  type        = number
  description = "Desired number of EKS nodes"
  default     = 3
}

variable "node_min" {
  type        = number
  description = "Minimum number of EKS nodes"
  default     = 2
}

variable "node_max" {
  type        = number
  description = "Maximum number of EKS nodes"
  default     = 6
}

variable "rds_instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.micro"
}

variable "domain_name" {
  type        = string
  description = "Domain name for the application"
  default     = ""
}

variable "certificate_arn" {
  type        = string
  description = "ACM certificate ARN for HTTPS"
  default     = ""
}