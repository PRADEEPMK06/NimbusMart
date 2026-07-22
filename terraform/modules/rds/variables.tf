variable "identifier" {
  type        = string
  description = "Identifier for the RDS instance"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for RDS"
}

variable "eks_node_sg_id" {
  type        = string
  description = "Security group ID for EKS nodes (to allow access to RDS)"
}

variable "db_name" {
  type        = string
  description = "Database name"
  default     = "ecommerce"
}

variable "db_username" {
  type        = string
  description = "Database master username"
  default     = "postgres"
}

variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
}

variable "instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.micro"
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment"
  default     = false
}

variable "deletion_protection" {
  type        = bool
  description = "Enable deletion protection"
  default     = false
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot on deletion"
  default     = true
}

variable "monitoring_role_arn" {
  type        = string
  description = "IAM role ARN for RDS monitoring"
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Additional tags"
  default     = {}
}