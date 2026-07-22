# NimbusMart Configuration Management Documentation

**Version:** 1.0  
**Last Updated:** July 2026  
**Project:** NimbusMart E-Commerce Platform  
**Purpose:** Configuration management, environment variables, and secrets handling

---

## Table of Contents

1. [Overview](#overview)
2. [Configuration Architecture](#configuration-architecture)
3. [Environment Configuration](#environment-configuration)
4. [Secrets Management](#secrets-management)
5. [Configuration Files Reference](#configuration-files-reference)
6. [Configuration Best Practices](#configuration-best-practices)
7. [Change Management](#change-management)
8. [Configuration Validation](#configuration-validation)
9. [Disaster Recovery](#disaster-recovery)

---

## 1. Overview

### 1.1 Purpose

This document defines how configuration is managed across the NimbusMart platform, including:

- Environment-specific configurations (dev, test, prod)
- Secrets and credentials management
- Configuration file structures and locations
- Best practices for configuration changes
- Change management procedures

### 1.2 Configuration Principles

NimbusMart follows these configuration management principles:

1. **Infrastructure as Code (IaC):** All infrastructure configuration is version-controlled in Terraform
2. **Environment Isolation:** Each environment (dev, prod) has separate, isolated configurations
3. **Secrets Separation:** Sensitive data is stored in AWS Secrets Manager, never in code
4. **Immutability:** Configuration changes trigger new deployments, not in-place modifications
5. **Auditability:** All configuration changes are tracked via Git commits and Terraform state
6. **Least Privilege:** Each component has only the configuration it needs to function

### 1.3 Configuration Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Runtime Configuration                              │
│ - Environment variables                                      │
│ - Kubernetes ConfigMaps and Secrets                          │
│ - Helm values overrides                                      │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Application Configuration                           │
│ - Helm values files (values.yaml, values-dev.yaml, etc.)     │
│ - Application environment variables                          │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Infrastructure Configuration                        │
│ - Terraform variables (terraform.tfvars)                     │
│ - Terraform modules (reusable components)                    │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Base Configuration                                  │
│ - Terraform module defaults                                  │
│ - Helm chart defaults (Chart.yaml, values.yaml)              │
│ - Dockerfile configurations                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Configuration Architecture

### 2.1 Configuration Flow

```
Git Repository (Version Control)
    │
    ├── terraform/environments/{dev,prod}/
    │   ├── main.tf              (Infrastructure wiring)
    │   ├── variables.tf         (Input variables)
    │   ├── terraform.tfvars     (Environment values)
    │   └── backend.tf           (State configuration)
    │
    ├── helm/ecommerce/
    │   ├── values.yaml          (Base defaults)
    │   ├── values-dev.yaml      (Dev overrides)
    │   ├── values-prod.yaml     (Prod overrides)
    │   └── templates/           (K8s manifests)
    │
    ├── .github/workflows/       (CI/CD pipelines)
    │
    └── apps/
        ├── backend/             (FastAPI app)
        │   ├── main.py
        │   ├── database.py
        │   └── requirements.txt
        └── frontend/            (Nginx app)
            ├── index.html
            ├── nginx.conf
            └── Dockerfile
                │
                ▼
        GitHub Actions (CI/CD)
                │
                ├── Terraform Apply (Infrastructure)
                ├── Docker Build (Container Images)
                └── Helm Deploy (Application)
                │
                ▼
        AWS Resources
            ├── EKS Cluster (Kubernetes)
            │   ├── ConfigMaps
            │   ├── Secrets
            │   └── Environment Variables
            ├── RDS PostgreSQL
            ├── Secrets Manager
            └── ECR (Docker Images)
```

### 2.2 Configuration Sources

| Source | Technology | Purpose | Version Controlled |
|--------|-----------|---------|-------------------|
| Terraform Modules | HCL | Infrastructure defaults | Yes |
| Terraform Variables | HCL | Environment-specific values | Yes |
| Helm Values | YAML | Application configuration | Yes |
| Kubernetes ConfigMaps | YAML | Runtime configuration | No (generated) |
| AWS Secrets Manager | JSON | Sensitive credentials | No (AWS managed) |
| GitHub Secrets | Encrypted | CI/CD credentials | No (GitHub managed) |
| Environment Variables | Shell | Runtime overrides | No (runtime) |

---

## 3. Environment Configuration

### 3.1 Environment Matrix

NimbusMart uses three Git branches that map to two AWS environments:

| Git Branch | AWS Environment | Purpose | Auto-Deploy | Manual Approval |
|-----------|----------------|---------|-------------|----------------|
| `development` | N/A (CI only) | Code validation, Terraform plan | No | No |
| `test` | Dev (ecommerce-dev) | Testing, QA, integration | Yes | No |
| `prod` | Prod (ecommerce-prod) | Production traffic | Yes | Yes (PR review) |

### 3.2 Terraform Environment Configuration

#### Development Environment (`terraform/environments/dev/`)

**File: `terraform/environments/dev/main.tf`**
```hcl
locals {
  env          = "dev"
  cluster_name = "ecommerce-${local.env}"
  name         = "ecommerce-${local.env}"
}

# VPC Module
module "vpc" {
  source       = "../../modules/vpc"
  name         = local.name
  vpc_cidr     = var.vpc_cidr
  cluster_name = local.cluster_name
}

# EKS Module - SPOT instances for cost savings
module "eks" {
  source             = "../../modules/eks"
  cluster_name       = local.cluster_name
  kubernetes_version = var.kubernetes_version
  private_subnet_ids = module.vpc.private_subnet_ids
  node_instance_type = var.node_instance_type
  capacity_type      = "SPOT"  # Cost optimization
  node_desired       = 2
  node_min           = 1
  node_max           = 3
}

# RDS Module - Single AZ, no deletion protection
module "rds" {
  source              = "../../modules/rds"
  identifier          = "${local.name}-postgres"
  vpc_id              = module.vpc.vpc_id
  vpc_cidr            = var.vpc_cidr
  private_subnet_ids  = module.vpc.private_subnet_ids
  eks_node_sg_id      = module.eks.node_security_group_id
  db_name             = "ecommerce"
  db_username         = "ecommerceadmin"
  db_password         = random_password.db.result
  instance_class      = var.db_instance_class
  multi_az            = false  # Single AZ for dev
  deletion_protection = false
  skip_final_snapshot = true
}

# Secrets Manager - 7 day retention
module "secrets_manager" {
  source      = "../../modules/secrets-manager"
  secret_name = "dev/ecommerce/db"
  db_username = "ecommerceadmin"
  db_password = random_password.db.result
  db_host     = module.rds.endpoint
  db_port     = module.rds.port
  db_name     = module.rds.db_name
}
```

**File: `terraform/environments/dev/terraform.tfvars`**
```hcl
# Network Configuration
vpc_cidr = "10.0.0.0/16"

# EKS Configuration
kubernetes_version = "1.29"
node_instance_type = "t3.medium"

# RDS Configuration
db_instance_class = "db.t3.micro"
db_name = "ecommerce"
db_username = "ecommerceadmin"
# db_password is auto-generated by random_password resource

# Tags
tags = {
  Environment = "dev"
  Project     = "nimbusmart"
  ManagedBy   = "terraform"
  CostCenter  = "engineering"
}
```

**File: `terraform/environments/dev/variables.tf`**
```hcl
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.29"
}

variable "node_instance_type" {
  description = "EC2 instance type for EKS worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
```

#### Production Environment (`terraform/environments/prod/`)

**File: `terraform/environments/prod/main.tf`**
```hcl
locals {
  env          = "prod"
  cluster_name = "ecommerce-${local.env}"
  name         = "ecommerce-${local.env}"
}

# EKS Module - ON_DEMAND instances for stability
module "eks" {
  source             = "../../modules/eks"
  cluster_name       = local.cluster_name
  kubernetes_version = var.kubernetes_version
  private_subnet_ids = module.vpc.private_subnet_ids
  node_instance_type = var.node_instance_type
  capacity_type      = "ON_DEMAND"  # Production stability
  node_desired       = 3
  node_min           = 2
  node_max           = 10
}

# RDS Module - Multi-AZ, deletion protection enabled
module "rds" {
  source              = "../../modules/rds"
  identifier          = "${local.name}-postgres"
  vpc_id              = module.vpc.vpc_id
  vpc_cidr            = var.vpc_cidr
  private_subnet_ids  = module.vpc.private_subnet_ids
  eks_node_sg_id      = module.eks.node_security_group_id
  db_name             = "ecommerce"
  db_username         = "ecommerceadmin"
  db_password         = random_password.db.result
  instance_class      = var.db_instance_class
  multi_az            = true             # High availability
  deletion_protection = true             # Prevent accidental destroy
  skip_final_snapshot = false            # Keep final snapshot
}

# Secrets Manager - 30 day retention
module "secrets_manager" {
  source                = "../../modules/secrets-manager"
  secret_name           = "prod/ecommerce/db"
  db_username           = "ecommerceadmin"
  db_password           = random_password.db.result
  db_host               = module.rds.endpoint
  db_port               = module.rds.port
  db_name               = module.rds.db_name
  recovery_window_days  = 30  # Longer retention for prod
}
```

**File: `terraform/environments/prod/terraform.tfvars`**
```hcl
# Network Configuration
vpc_cidr = "10.1.0.0/16"

# EKS Configuration
kubernetes_version = "1.29"
node_instance_type = "t3.large"

# RDS Configuration
db_instance_class = "db.t3.small"
db_name = "ecommerce"
db_username = "ecommerceadmin"

# Tags
tags = {
  Environment = "prod"
  Project     = "nimbusmart"
  ManagedBy   = "terraform"
  CostCenter  = "engineering"
  Backup      = "daily"
}
```

### 3.3 Helm Environment Configuration

#### Base Configuration (`helm/ecommerce/values.yaml`)

```yaml
# Default values for ecommerce chart
# These are the base defaults - overridden by environment-specific files

# Namespace configuration
namespace:
  name: ecommerce

# Service Account with IRSA
serviceAccount:
  name: backend-sa
  iamRoleArn: ""  # Set by Terraform output

# Frontend configuration
frontend:
  name: frontend
  replicaCount: 2
  image:
    repository: ""  # Set by CI/CD
    tag: latest
    pullPolicy: IfNotPresent
  service:
    type: ClusterIP
    port: 80
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi
  livenessProbe:
    path: /
    initialDelaySeconds: 30
    periodSeconds: 10
  readinessProbe:
    path: /
    initialDelaySeconds: 10
    periodSeconds: 5
  autoscaling:
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

# Backend configuration
backend:
  name: backend
  replicaCount: 2
  image:
    repository: ""  # Set by CI/CD
    tag: latest
    pullPolicy: IfNotPresent
  service:
    type: ClusterIP
    port: 8000
  env:
    dbSecretName: ecommerce-db-credentials
    sqlEcho: "false"
    allowedOrigins: "*"
    appVersion: "1.0.0"
    dbUsername: postgres
    dbPassword: ""
    dbHost: ""
    dbPort: "5432"
    dbName: ecommerce
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 512Mi
  livenessProbe:
    path: /health
    initialDelaySeconds: 30
    periodSeconds: 10
  readinessProbe:
    path: /health
    initialDelaySeconds: 10
    periodSeconds: 5
  startupProbe:
    path: /health
    initialDelaySeconds: 10
    periodSeconds: 5
    failureThreshold: 30
  autoscaling:
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

# Ingress configuration
ingress:
  host: ""
  scheme: internet-facing
  targetType: ip
  sslRedirect: "true"
  certificateArn: ""
  subnets: ""
  securityGroups: ""
  tags: {}

# Global configuration
global:
  awsRegion: us-east-1

# Pod Disruption Budget
podDisruptionBudget:
  minAvailable: 1

# PostgreSQL (optional - using RDS instead)
postgresql:
  enabled: false

# Redis (optional)
redis:
  enabled: false
```

#### Development Overrides (`helm/ecommerce/values-dev.yaml`)

```yaml
global:
  environment: dev
  awsRegion: us-west-2

frontend:
  image:
    repository: <AWS_ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/ecommerce-frontend
    tag: latest
  replicaCount: 1  # Single replica for dev
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 128Mi
  autoscaling:
    enabled: false  # No autoscaling in dev

backend:
  image:
    repository: <AWS_ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/ecommerce-backend
    tag: latest
  replicaCount: 1  # Single replica for dev
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  env:
    dbSecretName: "dev/ecommerce/db"
    sqlEcho: "true"  # Verbose SQL logs in dev
    allowedOrigins: "*"
  autoscaling:
    enabled: false

ingress:
  enabled: true
  scheme: internet-facing
  targetType: ip
  certificateArn: ""  # No TLS in dev - HTTP only
  subnets: ""  # Paste dev public subnet IDs
  securityGroups: ""  # Paste dev ALB security group ID
  host: ""  # Use ALB DNS name directly in dev
  tags: "Project=ecommerce-platform,Environment=dev"
```

#### Production Overrides (`helm/ecommerce/values-prod.yaml`)

```yaml
global:
  environment: prod
  awsRegion: us-west-2

frontend:
  image:
    repository: <AWS_ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/ecommerce-frontend
    tag: latest
  replicaCount: 2
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 300m
      memory: 256Mi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 8
    targetCPUUtilizationPercentage: 65

backend:
  image:
    repository: <AWS_ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/ecommerce-backend
    tag: latest
  replicaCount: 2
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  env:
    dbSecretName: "prod/ecommerce/db"
    sqlEcho: "false"  # Disable verbose SQL in prod
    allowedOrigins: "https://yourdomain.com,https://www.yourdomain.com"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 65

ingress:
  enabled: true
  scheme: internet-facing
  targetType: ip
  certificateArn: "arn:aws:acm:us-west-2:<AWS_ACCOUNT_ID>:certificate/<CERT_ID>"
  subnets: ""  # Paste prod public subnet IDs
  securityGroups: ""  # Paste prod ALB security group ID
  host: "yourdomain.com"  # Production domain
  tags: "Project=ecommerce-platform,Environment=prod"
```

---

## 4. Secrets Management

### 4.1 Secrets Architecture

NimbusMart uses a multi-layered secrets management approach:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: GitHub Secrets (CI/CD)                             │
│ - AWS_ROLE_ARN                                               │
│ - AWS_REGION                                                 │
│ - AWS_ACCOUNT_ID                                             │
│ - GRAFANA_ADMIN_PASSWORD                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: AWS Secrets Manager (Runtime)                      │
│ - Database credentials (username, password, host, port)      │
│ - Accessed via IRSA (IAM Roles for Service Accounts)         │
│ - Secret name: {env}/ecommerce/db                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Kubernetes Secrets (Application)                   │
│ - Created from AWS Secrets Manager                           │
│ - Mounted as environment variables or files                  │
│ - Namespace: ecommerce                                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 AWS Secrets Manager Configuration

#### Secret Structure

**Secret Name:** `dev/ecommerce/db` or `prod/ecommerce/db`

**Secret JSON Format:**
```json
{
  "username": "ecommerceadmin",
  "password": "AutoGeneratedRandomPassword123!@#",
  "host": "ecommerce-dev-postgres.xxxxxx.us-west-2.rds.amazonaws.com",
  "port": 5432,
  "dbname": "ecommerce"
}
```

#### Terraform Configuration

**File: `terraform/modules/secrets-manager/main.tf`**
```hcl
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = var.secret_name
  description             = "Database credentials for ${var.secret_name}"
  recovery_window_in_days = var.recovery_window_days

  tags = merge(var.tags, {
    Name        = var.secret_name
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id     = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = var.db_host
    port     = var.db_port
    dbname   = var.db_name
  })
}
```

**File: `terraform/modules/secrets-manager/variables.tf`**
```hcl
variable "secret_name" {
  description = "Name of the secret"
  type        = string
}

variable "db_username" {
  description = "Database username"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_host" {
  description = "Database host"
  type        = string
}

variable "db_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "recovery_window_in_days" {
  description = "Number of days to retain secret after deletion"
  type        = number
  default     = 7
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "tags" {
  description = "Tags for the secret"
  type        = map(string)
  default     = {}
}
```

### 4.3 IAM Roles for Service Accounts (IRSA)

IRSA allows Kubernetes pods to access AWS services without hardcoding credentials.

#### Backend Service Account IAM Role

**File: `terraform/modules/iam/main.tf`**
```hcl
# Kubernetes Service Account
resource "kubernetes_service_account" "backend_sa" {
  metadata {
    name      = var.service_account_name
    namespace = var.namespace
    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.backend_sa_role.arn
    }
  }
}

# IAM Role for Backend Service Account
resource "aws_iam_role" "backend_sa_role" {
  name = "${var.cluster_name}-backend-sa-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.oidc_provider_url}:sub" = "system:serviceaccount:${var.namespace}:${var.service_account_name}"
          }
        }
      }
    ]
  })

  tags = var.tags
}

# Policy to allow reading database secret from Secrets Manager
resource "aws_iam_policy" "backend_sa_policy" {
  name        = "${var.cluster_name}-backend-sa-policy"
  description = "Policy to allow backend pods to read database credentials"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.db_secret_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backend_sa_attach" {
  role       = aws_iam_role.backend_sa_role.name
  policy_arn = aws_iam_policy.backend_sa_policy.arn
}
```

#### Backend Application Secret Access

**File: `apps/backend/database.py`**
```python
import boto3
import json
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Fetch database credentials from AWS Secrets Manager
def get_db_credentials():
    """Retrieve database credentials from AWS Secrets Manager using IRSA."""
    secret_name = os.getenv("DB_SECRET_NAME", "dev/ecommerce/db")
    region_name = os.getenv("AWS_REGION", "us-west-2")
    
    # Create Secrets Manager client
    # IAM credentials are automatically provided via IRSA
    session = boto3.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )
    
    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except Exception as e:
        print(f"Error retrieving secret: {e}")
        raise
    
    # Parse secret
    secret = json.loads(get_secret_value_response['SecretString'])
    return secret

# Get credentials
credentials = get_db_credentials()

# Create SQLAlchemy engine
DATABASE_URL = f"postgresql://{credentials['username']}:{credentials['password']}@{credentials['host']}:{credentials['port']}/{credentials['dbname']}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

### 4.4 Kubernetes Secrets

Kubernetes secrets are created from AWS Secrets Manager values.

**File: `helm/ecommerce/templates/secret.yaml`**
```yaml
{{- if .Values.backend.env.dbSecretName }}
apiVersion: v1
kind: Secret
metadata:
  name: ecommerce-db-credentials
  namespace: {{ .Values.namespace.name }}
type: Opaque
data:
  # These values are populated by the deployment script or external tool
  # In production, use External Secrets Operator or similar
  db_username: {{ .Values.backend.env.dbUsername | b64enc }}
  db_password: {{ .Values.backend.env.dbPassword | b64enc }}
  db_host: {{ .Values.backend.env.dbHost | b64enc }}
  db_port: {{ .Values.backend.env.dbPort | b64enc }}
  db_name: {{ .Values.backend.env.dbName | b64enc }}
{{- end }}
```

**Alternative: Using External Secrets Operator**

For production, consider using the External Secrets Operator to automatically sync AWS Secrets Manager to Kubernetes Secrets:

```yaml
# ExternalSecret example
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ecommerce-db-credentials
  namespace: ecommerce
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: ecommerce-db-credentials
    creationPolicy: Owner
  data:
    - secretKey: db_username
      remoteRef:
        key: prod/ecommerce/db
        property: username
    - secretKey: db_password
      remoteRef:
        key: prod/ecommerce/db
        property: password
    - secretKey: db_host
      remoteRef:
        key: prod/ecommerce/db
        property: host
    - secretKey: db_port
      remoteRef:
        key: prod/ecommerce/db
        property: port
    - secretKey: db_name
      remoteRef:
        key: prod/ecommerce/db
        property: dbname
```

---

## 5. Configuration Files Reference

### 5.1 Terraform Configuration Files

#### Directory Structure
```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf              # Main configuration
│   │   ├── variables.tf         # Input variables
│   │   ├── terraform.tfvars     # Variable values
│   │   ├── outputs.tf           # Output values
│   │   └── backend.tf           # Remote state config
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       ├── terraform.tfvars
│       ├── outputs.tf
│       └── backend.tf
└── modules/
    ├── vpc/
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   └── README.md
    ├── eks/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── rds/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── ecr/
    │   ├── main.tf
    │   └── variables.tf
    ├── secrets-manager/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── iam/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

#### Key Configuration Parameters

**Terraform Variables (All Environments):**

| Variable | Type | Dev Value | Prod Value | Description |
|----------|------|-----------|------------|-------------|
| `vpc_cidr` | string | `10.0.0.0/16` | `10.1.0.0/16` | VPC CIDR block |
| `kubernetes_version` | string | `1.29` | `1.29` | EKS Kubernetes version |
| `node_instance_type` | string | `t3.medium` | `t3.large` | EC2 instance type |
| `db_instance_class` | string | `db.t3.micro` | `db.t3.small` | RDS instance class |
| `db_name` | string | `ecommerce` | `ecommerce` | Database name |
| `db_username` | string | `ecommerceadmin` | `ecommerceadmin` | Database username |
| `tags` | map | `{Environment: "dev"}` | `{Environment: "prod"}` | Resource tags |

**Terraform Outputs (Used by CI/CD):**

| Output | Description | Used By |
|--------|-------------|---------|
| `vpc_id` | VPC ID | ALB Controller |
| `cluster_endpoint` | EKS API endpoint | kubectl |
| `cluster_ca_certificate` | EKS CA certificate | kubectl |
| `oidc_provider_arn` | OIDC provider ARN | IAM/IRSA |
| `oidc_provider_url` | OIDC provider URL | IAM/IRSA |
| `node_security_group_id` | EKS node SG ID | RDS security group |
| `backend_sa_role_arn` | Backend SA IAM role ARN | Helm deployment |
| `alb_controller_role_arn` | ALB controller IAM role ARN | Helm deployment |
| `fluent_bit_role_arn` | Fluent Bit IAM role ARN | Helm deployment |
| `rds_endpoint` | RDS endpoint address | Secrets Manager |
| `rds_port` | RDS port | Secrets Manager |
| `secrets_manager_secret_arn` | Secret ARN | IAM policy |

### 5.2 Helm Configuration Files

#### Directory Structure
```
helm/
├── ecommerce/
│   ├── Chart.yaml              # Chart metadata
│   ├── values.yaml             # Base defaults
│   ├── values-dev.yaml         # Dev overrides
│   ├── values-prod.yaml        # Prod overrides
│   ├── values-main.yaml        # Main branch overrides
│   └── templates/
│       ├── _helpers.tpl        # Template helpers
│       ├── namespace.yaml      # Namespace creation
│       ├── serviceaccount.yaml # Service account with IRSA
│       ├── configmap.yaml      # Configuration map
│       ├── secret.yaml         # Kubernetes secret
│       ├── deployment-backend.yaml  # Backend deployment
│       ├── deployment-frontend.yaml # Frontend deployment
│       ├── service-backend.yaml     # Backend service
│       ├── service-frontend.yaml    # Frontend service
│       ├── ingress.yaml             # ALB ingress
│       ├── hpa-backend.yaml         # Backend autoscaling
│       ├── hpa-frontend.yaml        # Frontend autoscaling
│       ├── poddisruptionbudget.yaml # Pod disruption budget
│       └── networkpolicy.yaml       # Network policies
└── infrastructure/
    ├── aws-load-balancer-controller/
    │   └── values.yaml
    ├── cluster-autoscaler/
    │   └── values.yaml
    ├── logging/
    │   └── fluent-bit-values.yaml
    └── monitoring/
        └── prometheus-values.yaml
```

#### Key Helm Values

**Global Configuration:**
```yaml
global:
  environment: dev  # or prod
  awsRegion: us-west-2
  awsAccountId: "123456789012"
```

**Frontend Configuration:**
```yaml
frontend:
  replicaCount: 1  # 2 for prod
  image:
    repository: <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/ecommerce-frontend
    tag: latest
  resources:
    requests:
      cpu: 50m  # 100m for prod
      memory: 64Mi  # 128Mi for prod
    limits:
      cpu: 200m  # 300m for prod
      memory: 128Mi  # 256Mi for prod
  autoscaling:
    enabled: false  # true for prod
    minReplicas: 2
    maxReplicas: 8
    targetCPUUtilizationPercentage: 65
```

**Backend Configuration:**
```yaml
backend:
  replicaCount: 1  # 2 for prod
  image:
    repository: <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/ecommerce-backend
    tag: latest
  env:
    dbSecretName: "dev/ecommerce/db"  # "prod/ecommerce/db" for prod
    sqlEcho: "true"  # "false" for prod
    allowedOrigins: "*"  # "https://yourdomain.com" for prod
    appVersion: "1.0.0"
  resources:
    requests:
      cpu: 100m  # 200m for prod
      memory: 256Mi
    limits:
      cpu: 500m  # 1000m for prod
      memory: 512Mi  # 1Gi for prod
  autoscaling:
    enabled: false  # true for prod
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 65
```

**Ingress Configuration:**
```yaml
ingress:
  enabled: true
  scheme: internet-facing
  targetType: ip
  sslRedirect: "true"
  certificateArn: ""  # ACM certificate ARN for prod
  host: ""  # yourdomain.com for prod
  subnets: ""  # Public subnet IDs
  securityGroups: ""  # ALB security group ID
  tags: "Project=ecommerce-platform,Environment=dev"
```

### 5.3 Application Configuration

#### Backend Environment Variables

**File: `apps/backend/.env.example`**
```bash
# Application
APP_VERSION=1.0.0
LOG_LEVEL=INFO

# Database (populated from AWS Secrets Manager)
DB_SECRET_NAME=dev/ecommerce/db

# CORS
ALLOWED_ORIGINS=*

# API
API_V1_STR=/api
PROJECT_NAME=NimbusMart
```

**File: `apps/backend/main.py` (Environment Variable Usage)**
```python
import os

# Application configuration
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

# CORS configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# Database configuration
DB_SECRET_NAME = os.getenv("DB_SECRET_NAME", "dev/ecommerce/db")
```

#### Frontend Configuration

**File: `apps/frontend/script.js` (API Configuration)**
```javascript
// API configuration
const API_BASE_URL = window.location.origin;  // Use same origin
const SESSION_ID_KEY = 'nimbusmart_session_id';

// Generate or retrieve session ID
function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

// API request helper
async function apiRequest(endpoint, options = {}) {
  const sessionId = getSessionId();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}
```

**File: `apps/frontend/nginx.conf`**
```nginx
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend
    location /api {
        proxy_pass http://backend-service:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Session-ID $http_x_session_id;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://backend-service:8000/health;
    }
}
```

### 5.4 GitHub Actions Configuration

#### Required GitHub Secrets

| Secret Name | Description | Example Value | Required |
|-------------|-------------|---------------|----------|
| `AWS_ROLE_ARN` | IAM role ARN for test/dev deployments | `arn:aws:iam::123456789012:role/GitHubActionsDeploymentRole` | Yes |
| `AWS_ROLE_ARN_PROD` | IAM role ARN for production deployments | `arn:aws:iam::123456789012:role/GitHubActionsDeploymentRole` | Yes |
| `AWS_REGION` | AWS region for deployment | `us-west-2` | Yes |
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID | `123456789012` | Yes |
| `TF_STATE_BUCKET` | S3 bucket name for Terraform state | `nimbusmart-eks-tfstate-<unique>` | Yes |
| `TF_STATE_LOCK_TABLE` | DynamoDB table name for state locking | `nimbusmart-eks-tflock` | Yes |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password | `SecurePassword123!` | Yes |

#### GitHub Variables (Optional)

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `DEFAULT_AWS_REGION` | Default AWS region | `us-west-2` |
| `TERRAFORM_VERSION` | Terraform version | `1.7.5` |
| `KUBECTL_VERSION` | kubectl version | `1.29` |
| `HELM_VERSION` | Helm version | `3.14` |

---

## 6. Configuration Best Practices

### 6.1 General Principles

#### 1. Version Control Everything
- All configuration files must be in Git
- Never commit secrets or credentials
- Use `.gitignore` to exclude sensitive files

**File: `.gitignore`**
```gitignore
# Terraform
*.tfstate
*.tfstate.backup
.terraform/
.terraform.lock.hcl

# Secrets
*.pem
*.key
secrets/
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Docker
docker-compose.override.yml
```

#### 2. Use Environment Variables for Dynamic Values
```python
# Good: Use environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Bad: Hardcoded values
DATABASE_URL = "postgresql://user:pass@host:5432/db"
DEBUG = True
```

#### 3. Separate Configuration from Code
```
# Good: Configuration in separate files
config/
├── dev.yaml
├── prod.yaml
└── config_loader.py

# Bad: Configuration mixed with code
app.py:
  DEBUG = True
  DATABASE_URL = "..."
```

#### 4. Validate Configuration on Startup
```python
from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    debug: bool = False
    
    @validator("database_url")
    def validate_database_url(cls, v):
        if not v.startswith("postgresql://"):
            raise ValueError("Invalid database URL")
        return v
    
    class Config:
        env_file = ".env"

settings = Settings()
```

#### 5. Use Defaults Wisely
```yaml
# Good: Sensible defaults with overrides
server:
  port: 8080  # Default
  host: "0.0.0.0"  # Default
  
# Override in production
# server:
#   port: 443
#   host: "0.0.0.0"
```

### 6.2 Terraform Best Practices

#### 1. Use Modules for Reusability
```hcl
# Good: Reusable module
module "vpc" {
  source       = "../../modules/vpc"
  name         = local.name
  vpc_cidr     = var.vpc_cidr
  cluster_name = local.cluster_name
}

# Bad: Duplicate VPC code in each environment
```

#### 2. Use Variables for Flexibility
```hcl
# Good: Parameterized
variable "node_instance_type" {
  type        = string
  default     = "t3.medium"
  description = "EC2 instance type for EKS nodes"
}

# Bad: Hardcoded
resource "aws_instance" "node" {
  instance_type = "t3.medium"  # Can't change per environment
}
```

#### 3. Use Remote State
```hcl
# Good: Remote state with locking
terraform {
  backend "s3" {
    bucket         = "nimbusmart-eks-tfstate"
    key            = "terraform/environments/dev/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "nimbusmart-eks-tflock"
    encrypt        = true
  }
}

# Bad: Local state
# terraform {
#   backend "local" {}
# }
```

#### 4. Tag All Resources
```hcl
# Good: Consistent tagging
locals {
  common_tags = {
    Environment = var.environment
    Project     = "nimbusmart"
    ManagedBy   = "terraform"
    CostCenter  = "engineering"
  }
}

resource "aws_instance" "example" {
  # ...
  tags = local.common_tags
}

# Bad: No tags
```

### 6.3 Helm Best Practices

#### 1. Use Values Files for Environments
```bash
# Good: Environment-specific values
helm install ecommerce ./helm/ecommerce \
  -f helm/ecommerce/values.yaml \
  -f helm/ecommerce/values-dev.yaml

# Bad: Inline values (hard to maintain)
helm install ecommerce ./helm/ecommerce \
  --set frontend.replicaCount=1 \
  --set backend.replicaCount=1 \
  --set frontend.image.tag=latest
```

#### 2. Use Template Functions
```yaml
# Good: Template functions for flexibility
image:
  repository: "{{ .Values.global.awsAccountId }}.dkr.ecr.{{ .Values.global.awsRegion }}.amazonaws.com/ecommerce-frontend"
  tag: "{{ .Values.global.imageTag | default .Chart.AppVersion }}"

# Bad: Hardcoded values
image:
  repository: "123456789012.dkr.ecr.us-west-2.amazonaws.com/ecommerce-frontend"
  tag: "latest"
```

#### 3. Use Helpers for Repetitive Code
```yaml
# Good: Define helper in _helpers.tpl
{{- define "ecommerce.name" -}}
{{- printf "%s-%s" .Chart.Name .Values.namespace.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

# Use helper
metadata:
  name: {{ include "ecommerce.name" . }}
```

### 6.4 Secrets Management Best Practices

#### 1. Never Commit Secrets
```bash
# Good: Secrets in AWS Secrets Manager
aws secretsmanager create-secret --name dev/ecommerce/db --secret-string '{"username":"admin","password":"secret"}'

# Bad: Secrets in code
DATABASE_PASSWORD = "mysecretpassword"  # NEVER DO THIS
```

#### 2. Use IRSA for AWS Access
```yaml
# Good: IRSA annotation
serviceAccount:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/backend-sa-role

# Bad: AWS credentials in environment variables
env:
  - name: AWS_ACCESS_KEY_ID
    value: "AKIAIOSFODNN7EXAMPLE"
  - name: AWS_SECRET_ACCESS_KEY
    value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

#### 3. Rotate Secrets Regularly
```bash
# Rotate database password
cd terraform/environments/prod
terraform apply -var-file="terraform.tfvars" -replace random_password.db

# This generates a new password and updates:
# 1. RDS instance
# 2. AWS Secrets Manager
# 3. Kubernetes secret (on next deployment)
```

---

## 7. Change Management

### 7.1 Configuration Change Process

All configuration changes must follow this process:

```
1. Create Feature Branch
   └── git checkout -b feature/update-config

2. Make Changes
   ├── Update terraform.tfvars
   ├── Update values.yaml
   └── Update application code

3. Test Changes Locally (if possible)
   ├── terraform plan
   ├── helm template
   └── Run tests

4. Commit Changes
   └── git commit -m "feat: Update RDS instance class to db.t3.small"

5. Push to Development Branch
   └── git push origin feature/update-config

6. Create Pull Request
   └── PR: feature/update-config → development

7. CI Validation
   ├── Terraform plan runs
   ├── Docker builds
   └── Linting passes

8. Code Review
   └── At least 1 approval required

9. Merge to Development
   └── Triggers CI workflow

10. Merge to Test
    └── Triggers deployment to dev environment

11. Verify in Test Environment
    └── Manual testing

12. Merge to Prod
    └── Triggers production deployment
```

### 7.2 Change Types

#### Type 1: Configuration Value Change
**Example:** Change RDS instance class from `db.t3.micro` to `db.t3.small`

**Process:**
1. Update `terraform/environments/prod/terraform.tfvars`
2. Create PR to `development` branch
3. CI runs `terraform plan` (review plan output)
4. Merge through test to prod
5. Terraform applies changes automatically

**Rollback:** Revert the change in terraform.tfvars and re-apply

#### Type 2: Infrastructure Code Change
**Example:** Add new security group rule

**Process:**
1. Update Terraform module code
2. Run `terraform plan` locally to verify
3. Create PR with detailed description
4. Require 2 approvals for production
5. Test in dev environment first
6. Deploy to production

**Rollback:** Revert code changes and re-apply

#### Type 3: Application Configuration Change
**Example:** Change CORS allowed origins

**Process:**
1. Update `helm/ecommerce/values-prod.yaml`
2. Update application code if needed
3. Test in dev environment
4. Deploy to production via Helm upgrade

**Rollback:** `helm rollback ecommerce <revision> -n ecommerce`

#### Type 4: Secrets Rotation
**Example:** Rotate database password

**Process:**
1. Update Terraform to generate new password
2. Apply Terraform (updates Secrets Manager)
3. Redeploy application (picks up new secret)
4. Verify application functionality
5. Update any documentation

**Rollback:** Restore previous secret version in AWS Secrets Manager

### 7.3 Change Approval Matrix

| Change Type | Dev Approval | Test Approval | Prod Approval |
|-------------|-------------|---------------|---------------|
| Documentation | 1 | 1 | 1 |
| Configuration value | 0 | 1 | 2 |
| Infrastructure code | 1 | 1 | 2 |
| Application code | 1 | 1 | 2 |
| Secrets rotation | 0 | 1 | 2 |
| Emergency hotfix | 0 | 0 | 1 |

---

## 8. Configuration Validation

### 8.1 Terraform Validation

#### Pre-Apply Validation
```bash
# Navigate to environment directory
cd terraform/environments/prod

# Initialize Terraform
terraform init

# Validate configuration syntax
terraform validate

# Format configuration
terraform fmt -recursive

# Plan changes
terraform plan -var-file="terraform.tfvars" -out=tfplan

# Review plan output
terraform show tfplan
```

#### Automated Validation in CI/CD
```yaml
# .github/workflows/ci-development.yml
- name: Terraform Format
  run: terraform fmt -check -recursive

- name: Terraform Validate
  run: terraform validate

- name: Terraform Plan (Dev)
  run: terraform plan -var-file="terraform.tfvars"

- name: Terraform Plan (Prod)
  run: |
    cd terraform/environments/prod
    terraform plan -var-file="terraform.tfvars"
```

### 8.2 Helm Validation

#### Pre-Deploy Validation
```bash
# Lint Helm chart
helm lint ./helm/ecommerce

# Template rendering test
helm template ecommerce ./helm/ecommerce \
  -f helm/ecommerce/values.yaml \
  -f helm/ecommerce/values-dev.yaml

# Dry-run installation
helm install ecommerce ./helm/ecommerce \
  -n ecommerce \
  -f helm/ecommerce/values.yaml \
  -f helm/ecommerce/values-dev.yaml \
  --dry-run --debug
```

#### Automated Validation in CI/CD
```yaml
- name: Helm Lint
  run: helm lint ./helm/ecommerce

- name: Helm Template
  run: |
    helm template ecommerce ./helm/ecommerce \
      -f helm/ecommerce/values.yaml \
      -f helm/ecommerce/values-dev.yaml \
      > /tmp/rendered.yaml
```

### 8.3 Application Configuration Validation

#### Backend Validation
```python
# apps/backend/config.py
from pydantic import BaseSettings, validator, HttpUrl
import os

class Settings(BaseSettings):
    # Application
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Database
    db_secret_name: str
    db_host: str
    db_port: int
    db_name: str
    
    # CORS
    allowed_origins: list[str]
    
    # API
    api_v1_str: str = "/api"
    project_name: str = "NimbusMart"
    
    @validator("db_port")
    def validate_db_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError("Invalid port number")
        return v
    
    @validator("allowed_origins")
    def validate_origins(cls, v):
        if "*" in v and len(v) > 1:
            raise ValueError("Cannot specify wildcard with other origins")
        return v
    
    class Config:
        env_file = ".env"

# Validate on import
settings = Settings()
print(f"✓ Configuration validated: {settings.project_name} v{settings.app_version}")
```

#### Frontend Validation
```javascript
// apps/frontend/config.js
const config = {
  apiBaseUrl: process.env.REACT_APP_API_URL || window.location.origin,
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
};

// Validate configuration
function validateConfig() {
  const errors = [];
  
  if (!config.apiBaseUrl) {
    errors.push('API base URL is required');
  }
  
  if (!['development', 'test', 'production'].includes(config.environment)) {
    errors.push('Invalid environment');
  }
  
  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    throw new Error('Invalid configuration');
  }
  
  console.log(`✓ Configuration validated for ${config.environment}`);
}

validateConfig();
```

### 8.4 Configuration Testing

#### Test Configuration Loading
```python
# tests/test_config.py
import pytest
from config import Settings

def test_default_settings():
    """Test default configuration values."""
    settings = Settings()
    assert settings.app_version == "1.0.0"
    assert settings.debug == False

def test_environment_variables(monkeypatch):
    """Test environment variable override."""
    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.setenv("DB_SECRET_NAME", "prod/ecommerce/db")
    
    settings = Settings()
    assert settings.debug == True
    assert settings.db_secret_name == "prod/ecommerce/db"

def test_invalid_configuration(monkeypatch):
    """Test invalid configuration raises error."""
    monkeypatch.setenv("DB_PORT", "99999")
    
    with pytest.raises(ValueError):
        Settings()
```

---

## 9. Disaster Recovery

### 9.1 Configuration Backup

#### Terraform State Backup
```bash
# Manual backup
cd terraform/environments/prod
terraform state pull > backup-$(date +%Y%m%d-%H%M%S).tfstate

# Automated backup (add to CI/CD)
- name: Backup Terraform State
  run: |
    aws s3 cp s3://nimbusmart-eks-tfstate/prod/terraform.tfstate \
           s3://nimbusmart-eks-tfstate-backup/prod/terraform-$(date +%Y%m%d).tfstate
```

#### Secrets Backup
```bash
# Export all secrets (encrypted)
aws secretsmanager get-secret-value \
  --secret-id prod/ecommerce/db \
  --query 'SecretString' \
  --output text | \
  gpg --encrypt --recipient admin@example.com \
  > backup-secrets-$(date +%Y%m%d).gpg
```

### 9.2 Configuration Recovery

#### Terraform State Recovery
```bash
# Restore from backup
aws s3 cp s3://nimbusmart-eks-tfstate-backup/prod/terraform-20240101.tfstate \
           terraform.tfstate

# Initialize with restored state
terraform init
terraform apply
```

#### Secrets Recovery
```bash
# Restore secret from backup
gpg --decrypt backup-secrets-20240101.gpg | \
  aws secretsmanager put-secret-value \
    --secret-id prod/ecommerce/db \
    --secret-string file:///dev/stdin
```

### 9.3 Configuration Drift Detection

```bash
# Detect Terraform drift
cd terraform/environments/prod
terraform plan -var-file="terraform.tfvars"

# If drift detected, review and apply changes
terraform apply -var-file="terraform.tfvars"

# Automated drift detection (add to CI/CD)
- name: Detect Configuration Drift
  run: |
    terraform plan -var-file="terraform.tfvars" -detailed-exitcode
    # Exit code 0: No changes
    # Exit code 1: Error
    # Exit code 2: Changes detected (drift)
```

### 9.4 Disaster Recovery Runbook

#### Scenario 1: Terraform State Corruption

**Symptoms:**
- `terraform plan` shows unexpected changes
- State file is corrupted or deleted
- Resources exist in AWS but not in state

**Recovery Steps:**
```bash
# 1. Import existing resources into state
terraform import module.vpc.aws_vpc.this <vpc-id>
terraform import module.eks.aws_eks_cluster.this <cluster-name>
terraform import module.rds.aws_db_instance.this <db-instance-id>

# 2. Or restore from backup
aws s3 cp s3://nimbusmart-eks-tfstate-backup/prod/terraform-latest.tfstate terraform.tfstate

# 3. Verify state
terraform show

# 4. Plan to ensure consistency
terraform plan -var-file="terraform.tfvars"
```

#### Scenario 2: Secrets Manager Secret Deleted

**Symptoms:**
- Application fails with "Secret not found" error
- Database connection fails

**Recovery Steps:**
```bash
# 1. Check if secret is recoverable (automatic deletion)
aws secretsmanager describe-secret --secret-id prod/ecommerce/db

# 2. If within recovery window, restore
aws secretsmanager restore-secret-from-version \
  --secret-id prod/ecommerce/db \
  --version-id <previous-version-id>

# 3. If permanently deleted, recreate from backup
gpg --decrypt backup-secrets-20240101.gpg | \
  aws secretsmanager create-secret \
    --name prod/ecommerce/db \
    --secret-string file:///dev/stdin

# 4. Redeploy application to pick up new secret
helm upgrade ecommerce ./helm/ecommerce \
  -n ecommerce \
  -f helm/ecommerce/values.yaml \
  -f helm/ecommerce/values-prod.yaml
```

#### Scenario 3: Complete Environment Loss

**Symptoms:**
- All AWS resources deleted
- EKS cluster gone
- RDS instance deleted
- Terraform state lost

**Recovery Steps:**
```bash
# 1. Restore Terraform state from backup
aws s3 cp s3://nimbusmart-eks-tfstate-backup/prod/terraform-latest.tfstate terraform.tfstate

# 2. Restore secrets from backup
gpg --decrypt backup-secrets-20240101.gpg | \
  aws secretsmanager create-secret \
    --name prod/ecommerce/db \
    --secret-string file:///dev/stdin

# 3. Restore RDS from snapshot (if available)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ecommerce-prod-postgres \
  --db-snapshot-identifier rds:ecommerce-prod-postgres-20240101-00-00

# 4. Run Terraform apply
cd terraform/environments/prod
terraform init
terraform apply -var-file="terraform.tfvars"

# 5. Redeploy application
helm upgrade ecommerce ./helm/ecommerce \
  -n ecommerce \
  -f helm/ecommerce/values.yaml \
  -f helm/ecommerce/values-prod.yaml
```

---

## Appendix A: Configuration Checklist

### Pre-Deployment Checklist

- [ ] All configuration files committed to Git
- [ ] No secrets in code or Git history
- [ ] Terraform plan reviewed and approved
- [ ] Helm values validated
- [ ] Environment variables documented
- [ ] Database credentials rotated (if needed)
- [ ] SSL certificates valid (production)
- [ ] DNS records configured (production)
- [ ] Monitoring and alerting configured
- [ ] Backup procedures tested

### Post-Deployment Checklist

- [ ] All pods running and healthy
- [ ] Health check endpoint responding
- [ ] Database connectivity verified
- [ ] Logs flowing to CloudWatch
- [ ] Metrics visible in Grafana
- [ ] ALB DNS resolving correctly
- [ ] SSL certificate valid (production)
- [ ] No errors in application logs
- [ ] Performance metrics within acceptable range
- [ ] Backup jobs scheduled

### Configuration Change Checklist

- [ ] Change documented in PR description
- [ ] Impact assessment completed
- [ ] Rollback plan defined
- [ ] Tested in dev environment
- [ ] Reviewed by team members
- [ ] Approved by required stakeholders
- [ ] Monitoring alerts updated (if needed)
- [ ] Documentation updated
- [ ] Post-change verification completed

---

## Appendix B: Configuration Naming Conventions

### Resource Naming

| Resource Type | Naming Pattern | Example |
|--------------|----------------|---------|
| VPC | `{project}-{environment}` | `ecommerce-dev` |
| EKS Cluster | `{project}-{environment}` | `ecommerce-prod` |
| RDS Instance | `{project}-{environment}-postgres` | `ecommerce-dev-postgres` |
| ECR Repository | `{project}-{component}` | `ecommerce-backend` |
| Secrets Manager Secret | `{environment}/{project}/{component}` | `prod/ecommerce/db` |
| S3 Bucket (Terraform State) | `{project}-eks-tfstate-{suffix}` | `nimbusmart-eks-tfstate-pk` |
| DynamoDB Table (State Lock) | `{project}-eks-tflock` | `nimbusmart-eks-tflock` |
| Kubernetes Namespace | `{project}` | `ecommerce` |
| Kubernetes Service Account | `{component}-sa` | `backend-sa` |
| IAM Role | `{cluster}-{component}-role` | `ecommerce-prod-backend-sa-role` |

### Tagging Standards

| Tag Key | Description | Required | Example |
|---------|-------------|----------|---------|
| `Environment` | Deployment environment | Yes | `dev`, `prod` |
| `Project` | Project name | Yes | `nimbusmart` |
| `ManagedBy` | Management tool | Yes | `terraform`, `helm` |
| `CostCenter` | Cost allocation | Yes | `engineering` |
| `Owner` | Team/individual owner | Yes | `platform-team` |
| `Backup` | Backup policy | No | `daily`, `weekly` |
| `DataClassification` | Data sensitivity | No | `public`, `internal`, `confidential` |

---

## Appendix C: Configuration Migration Guide

### Migrating from Hardcoded to Environment Variables

**Before:**
```python
# apps/backend/database.py
DATABASE_URL = "postgresql://admin:password123@host:5432/ecommerce"
```

**After:**
```python
# apps/backend/database.py
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")
```

### Migrating from Local to Remote State

**Before:**
```hcl
# terraform/environments/prod/main.tf
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

**After:**
```hcl
# terraform/environments/prod/backend.tf
terraform {
  backend "s3" {
    bucket         = "nimbusmart-eks-tfstate"
    key            = "terraform/environments/prod/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "nimbusmart-eks-tflock"
    encrypt        = true
  }
}
```

**Migration Steps:**
```bash
# 1. Create S3 bucket and DynamoDB table
aws s3 mb s3://nimbusmart-eks-tfstate
aws dynamodb create-table --table-name nimbusmart-eks-tflock ...

# 2. Initialize Terraform with new backend
terraform init -migrate-state

# 3. Verify state migration
terraform state list

# 4. Run plan to ensure consistency
terraform plan -var-file="terraform.tfvars"
```

---

## Appendix D: Configuration Glossary

| Term | Definition |
|------|-----------|
| **IaC** | Infrastructure as Code - Managing infrastructure through code |
| **Terraform** | Open-source IaC tool by HashiCorp |
| **Helm** | Kubernetes package manager |
| **IRSA** | IAM Roles for Service Accounts - AWS feature for Kubernetes |
| **Secrets Manager** | AWS service for storing and managing secrets |
| **ConfigMap** | Kubernetes object for storing non-sensitive configuration |
| **terraform.tfvars** | Terraform variable definition file |
| **Helm Values** | Configuration file for Helm charts |
| **OIDC** | OpenID Connect - Authentication protocol |
| **RDS** | Amazon Relational Database Service |
| **EKS** | Amazon Elastic Kubernetes Service |
| **ECR** | Amazon Elastic Container Registry |
| **ALB** | Application Load Balancer |
| **CI/CD** | Continuous Integration/Continuous Deployment |

---

**End of Configuration Management Documentation**