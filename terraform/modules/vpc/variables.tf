variable "name" {
  type        = string
  description = "Name prefix for all resources"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., main, dev, prod)"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones"
}

variable "cluster_name" {
  type        = string
  description = "EKS cluster name for tagging subnets"
}

variable "tags" {
  type        = map(string)
  description = "Additional tags to apply to all resources"
  default     = {}
}

variable "flow_log_role_arn" {
  type        = string
  description = "IAM role ARN for VPC flow logs"
  default     = ""
}

variable "flow_log_destination" {
  type        = string
  description = "Destination for VPC flow logs (CloudWatch log group ARN or S3 bucket ARN)"
  default     = ""
}