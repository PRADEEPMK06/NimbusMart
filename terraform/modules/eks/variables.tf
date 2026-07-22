variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster"
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version"
  default     = "1.30"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for EKS nodes"
}

variable "node_instance_type" {
  type        = string
  description = "EC2 instance type for worker nodes"
  default     = "t3.medium"
}

variable "capacity_type" {
  type        = string
  description = "Capacity type for worker nodes (ON_DEMAND or SPOT)"
  default     = "ON_DEMAND"
}

variable "node_desired" {
  type        = number
  description = "Desired number of worker nodes"
  default     = 3
}

variable "node_min" {
  type        = number
  description = "Minimum number of worker nodes"
  default     = 2
}

variable "node_max" {
  type        = number
  description = "Maximum number of worker nodes"
  default     = 6
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "cluster_role_arn" {
  type        = string
  description = "IAM role ARN for EKS cluster"
}

variable "node_role_arn" {
  type        = string
  description = "IAM role ARN for EKS nodes"
}

variable "public_access_cidrs" {
  type        = list(string)
  description = "CIDR blocks allowed to access the EKS cluster API"
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  type        = map(string)
  description = "Additional tags"
  default     = {}
}

variable "environment" {
  type        = string
  description = "Environment name"
}