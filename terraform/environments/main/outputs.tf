# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = module.vpc.database_subnet_ids
}

# EKS Outputs
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_ca_certificate" {
  description = "EKS cluster CA certificate"
  value       = module.eks.cluster_ca_certificate
  sensitive   = true
}

output "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  value       = module.eks.oidc_provider_arn
}

output "eks_node_security_group_id" {
  description = "EKS node security group ID"
  value       = module.eks.node_security_group_id
}

# ECR Outputs
output "ecr_backend_url" {
  description = "ECR backend repository URL"
  value       = module.ecr.repository_urls["backend"]
}

output "ecr_frontend_url" {
  description = "ECR frontend repository URL"
  value       = module.ecr.repository_urls["frontend"]
}

output "ecr_backend_arn" {
  description = "ECR backend repository ARN"
  value       = module.ecr.repository_arns["backend"]
}

output "ecr_frontend_arn" {
  description = "ECR frontend repository ARN"
  value       = module.ecr.repository_arns["frontend"]
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS port"
  value       = module.rds.port
}

output "rds_db_name" {
  description = "RDS database name"
  value       = module.rds.db_name
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = module.rds.security_group_id
}

# Secrets Manager Outputs
output "db_secret_arn" {
  description = "Database secret ARN"
  value       = module.secrets_manager.secret_arn
  sensitive   = true
}

output "db_secret_name" {
  description = "Database secret name"
  value       = module.secrets_manager.secret_name
}

# IAM Outputs
output "backend_sa_role_arn" {
  description = "Backend service account IAM role ARN"
  value       = module.iam.backend_sa_role_arn
}

output "alb_controller_role_arn" {
  description = "ALB controller IAM role ARN"
  value       = module.iam.alb_controller_role_arn
}

# General Outputs
output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}