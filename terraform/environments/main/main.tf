# terraform/environments/main/main.tf
# Main environment configuration

terraform {
  backend "s3" {
    bucket         = "nimbusmart-terraform-state"
    key            = "main/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "nimbusmart-terraform-locks"
  }
}

# ── VPC Module ───────────────────────────────────────────────────────────────

module "vpc" {
  source = "../../modules/vpc"

  name                = "nimbusmart-main"
  environment         = "main"
  vpc_cidr            = "10.0.0.0/16"
  availability_zones  = ["us-east-1a", "us-east-1b", "us-east-1c"]
  cluster_name        = "nimbusmart-main"

  tags = {
    Project = "NimbusMart"
    Owner   = "Platform Team"
  }
}

# ── EKS Module ───────────────────────────────────────────────────────────────

module "eks" {
  source = "../../modules/eks"

  cluster_name       = "nimbusmart-main"
  kubernetes_version = "1.30"
  private_subnet_ids = module.vpc.private_subnet_ids
  node_instance_type = "t3.medium"
  capacity_type      = "ON_DEMAND"
  node_desired       = 3
  node_min           = 2
  node_max           = 6
  vpc_id             = module.vpc.vpc_id
  public_access_cidrs = ["0.0.0.0/0"]

  tags = {
    Project = "NimbusMart"
    Owner   = "Platform Team"
  }
}

# ── ECR Module ───────────────────────────────────────────────────────────────

module "ecr" {
  source = "../../modules/ecr"

  name_prefix     = "nimbusmart"
  environment     = "main"
  repository_names = ["backend", "frontend"]

  tags = {
    Project = "NimbusMart"
    Owner   = "Platform Team"
  }
}

# ── RDS Module ───────────────────────────────────────────────────────────────

module "rds" {
  source = "../../modules/rds"

  identifier         = "nimbusmart-main-db"
  environment        = "main"
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = module.vpc.vpc_cidr
  private_subnet_ids = module.vpc.database_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id
  db_name            = "ecommerce"
  db_username        = "postgres"
  db_password        = var.db_password
  instance_class     = "db.t3.micro"
  multi_az           = false
  deletion_protection = false
  skip_final_snapshot = true

  tags = {
    Project = "NimbusMart"
    Owner   = "Platform Team"
  }
}

# ── Secrets Manager Module ───────────────────────────────────────────────────

module "secrets_manager" {
  source = "../../modules/secrets-manager"

  secret_name  = "nimbusmart/main/db-credentials"
  environment  = "main"
  db_username  = module.rds.db_name
  db_password  = var.db_password
  db_host      = module.rds.endpoint
  db_port      = module.rds.port
  db_name      = module.rds.db_name

  tags = {
    Project = "NimbusMart"
    Owner   = "Platform Team"
  }
}

# ── IAM Module ───────────────────────────────────────────────────────────────

module "iam" {
  source = "../../modules/iam"

  cluster_name      = module.eks.cluster_name
  environment       = "main"
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  namespace         = "ecommerce"
  db_secret_arn     = module.secrets_manager.secret_arn

  tags = {
    Project = "NimbusMart"
    Owner   = "Platform Team"
  }
}