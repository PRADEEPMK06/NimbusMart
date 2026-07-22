# NimbusMart Deployment Documentation

**Version:** 1.0  
**Last Updated:** July 2026  
**Project:** NimbusMart E-Commerce Platform  
**Deployment Target:** AWS EKS with Terraform & Helm

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Deployment Environments](#deployment-environments)
5. [Step-by-Step Deployment Guide](#step-by-step-deployment-guide)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Troubleshooting](#troubleshooting)
11. [Security Considerations](#security-considerations)

---

## 1. Overview

### 1.1 Purpose

This document provides comprehensive instructions for deploying the NimbusMart e-commerce platform to AWS using Infrastructure as Code (IaC) principles. The deployment utilizes:

- **Terraform** for infrastructure provisioning
- **Amazon EKS** for container orchestration
- **Helm** for application deployment
- **GitHub Actions** for CI/CD automation
- **AWS ECR** for container image storage

### 1.2 Deployment Strategy

NimbusMart follows a **3-branch GitFlow deployment strategy**:

```
development → test → production
```

- **development**: CI validation and testing
- **test**: Automated deployment to dev/test environment
- **prod**: Production deployment with manual approval

### 1.3 Key Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Compute | Amazon EKS (Kubernetes) | Container orchestration |
| Database | Amazon RDS PostgreSQL | Persistent data storage |
| Container Registry | Amazon ECR | Docker image storage |
| Load Balancer | AWS ALB | Traffic distribution |
| Secrets Management | AWS Secrets Manager | Credential storage |
| Monitoring | Prometheus + Grafana | Metrics and dashboards |
| Logging | Fluent Bit + CloudWatch | Log aggregation |
| CI/CD | GitHub Actions | Automated deployments |

---

## 2. Prerequisites

### 2.1 Required Tools

Install the following tools on your local machine:

```bash
# AWS CLI (v2.x)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Terraform (v1.7.5+)
wget https://releases.hashicorp.com/terraform/1.7.5/terraform_1.7.5_linux_amd64.zip
unzip terraform_1.7.5_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Helm (v3.x)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Git
sudo apt-get install git -y

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**Windows Users:**
- Use Chocolatey: `choco install awscli terraform kubernetes-cli helm docker-desktop git`
- Or download installers from official websites

### 2.2 AWS Account Setup

1. **Create AWS Account**
   - Sign up at https://aws.amazon.com/
   - Enable IAM access

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, region (e.g., us-west-2), and output format (json)
   ```

3. **Verify AWS Access**
   ```bash
   aws sts get-caller-identity
   # Should return your AWS Account ID and ARN
   ```

### 2.3 GitHub Repository Setup

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "feat: Initial commit of NimbusMart codebase"
   git branch -M development
   git remote add origin https://github.com/YOUR_USERNAME/NimbusMart.git
   git push -u origin development
   ```

2. **Create Branches**
   ```bash
   git checkout -b test
   git push -u origin test
   git checkout -b prod
   git push -u origin prod
   ```

### 2.4 Required AWS Permissions

Your AWS user/role needs the following permissions:

- **VPC**: Create/manage VPCs, subnets, route tables, NAT gateways
- **EKS**: Create/manage EKS clusters, node groups
- **ECR**: Create repositories, push/pull images
- **RDS**: Create/manage PostgreSQL instances
- **Secrets Manager**: Create and manage secrets
- **IAM**: Create roles, policies, OIDC providers
- **EC2**: Manage security groups, launch templates
- **CloudWatch**: Create log groups and streams
- **S3/DynamoDB**: Create state storage (for bootstrap)

---

## 3. Architecture Overview

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS Application Load Balancer (ALB)            │
│                  (Public Subnets - 3 AZs)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Amazon EKS Cluster                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Namespace: ecommerce                                │  │
│  │  ┌──────────────┐          ┌──────────────┐         │  │
│  │  │   Frontend   │          │   Backend    │         │  │
│  │  │   (Nginx)    │          │  (FastAPI)   │         │  │
│  │  │  Replicas: 2 │          │  Replicas: 2 │         │  │
│  │  └──────────────┘          └──────────────┘         │  │
│  │         │                        │                   │  │
│  │         └────────────┬───────────┘                   │  │
│  │                      ▼                                │  │
│  │              ┌───────────────┐                        │  │
│  │              │  IRSA Role    │                        │  │
│  │              │  (Backend SA) │                        │  │
│  │              └───────────────┘                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Infrastructure Components:                                │
│  - AWS Load Balancer Controller                            │
│  - Cluster Autoscaler                                      │
│  - Fluent Bit (Logging)                                    │
│  - Prometheus + Grafana (Monitoring)                       │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Amazon RDS PostgreSQL                           │
│              (Private Database Subnets)                     │
│              - Multi-AZ (Production)                        │
│              - Single-AZ (Development)                      │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS Secrets Manager                             │
│         (Database credentials storage)                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Network Architecture

**VPC Configuration:**
- **CIDR Block:** 10.0.0.0/16 (customizable via terraform.tfvars)
- **Availability Zones:** 3 AZs for high availability
- **Subnets:**
  - 3 Public Subnets (for ALB and NAT Gateways)
  - 3 Private Subnets (for EKS worker nodes)
  - 3 Database Subnets (for RDS - isolated)

**Security Groups:**
- **ALB Security Group:** Allows inbound 80/443 from 0.0.0.0/0
- **EKS Node Security Group:** Allows inbound from ALB SG on app ports
- **RDS Security Group:** Allows inbound 5432 only from EKS Node SG

### 3.3 Data Flow

1. **User Request** → ALB (HTTPS/HTTP)
2. **ALB** → Routes to Frontend (/) or Backend (/api, /health)
3. **Frontend** → Makes API calls to Backend via ALB
4. **Backend** → Reads/Writes to RDS PostgreSQL
5. **Backend** → Fetches DB credentials from Secrets Manager (via IRSA)
6. **Logs** → Fluent Bit → CloudWatch Logs
7. **Metrics** → Prometheus → Grafana Dashboard

---

## 4. Deployment Environments

### 4.1 Environment Comparison

| Aspect | Development/Test | Production |
|--------|-----------------|------------|
| **Terraform State** | S3 bucket (shared) | S3 bucket (shared) |
| **EKS Node Capacity** | SPOT instances | ON_DEMAND instances |
| **EKS Node Count** | 2-3 nodes (min: 1, max: 3) | 3-10 nodes (min: 2, max: 10) |
| **RDS Multi-AZ** | Disabled (cost saving) | Enabled (HA) |
| **RDS Deletion Protection** | Disabled | Enabled |
| **Replicas (Frontend)** | 1 | 2 |
| **Replicas (Backend)** | 1 | 2 |
| **Autoscaling** | Disabled | Enabled (2-10 replicas) |
| **TLS/HTTPS** | HTTP only | HTTPS with ACM certificate |
| **Database Password Length** | 24 characters | 32 characters |
| **Secrets Manager Retention** | 7 days | 30 days |
| **Cost Optimization** | SPOT instances, single AZ | ON_DEMAND, Multi-AZ |

### 4.2 Environment URLs

After deployment, access your application at:

- **Test Environment:** `http://<alb-dns-name>/health`
- **Production Environment:** `https://<your-domain.com>/health`

---

## 5. Step-by-Step Deployment Guide

### Phase 1: One-Time AWS Setup

#### Step 1.1: Create OIDC Identity Provider

This allows GitHub Actions to authenticate to AWS without long-lived credentials.

```bash
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"
```

**Expected Output:**
```json
{
    "OpenIDConnectProviderArn": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
}
```

#### Step 1.2: Create IAM Role for GitHub Actions

Create a trust policy file `trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_USERNAME/NimbusMart:*"
        }
      }
    }
  ]
}
```

**Replace placeholders:**
- `YOUR_AWS_ACCOUNT_ID`: Your 12-digit AWS account ID
- `YOUR_USERNAME`: Your GitHub username

Create the IAM role:

```bash
aws iam create-role \
  --role-name "GitHubActionsDeploymentRole" \
  --assume-role-policy-document file://trust-policy.json
```

Attach Administrator Access policy:

```bash
aws iam attach-role-policy \
  --role-name "GitHubActionsDeploymentRole" \
  --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"
```

**Note the Role ARN:**
```bash
aws iam get-role --role-name GitHubActionsDeploymentRole --query 'Role.Arn' --output text
# Example: arn:aws:iam::123456789012:role/GitHubActionsDeploymentRole
```

#### Step 1.3: Configure GitHub Repository Secrets

Navigate to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_ROLE_ARN` | `arn:aws:iam::123456789012:role/GitHubActionsDeploymentRole` | IAM role for test/dev deployments |
| `AWS_ROLE_ARN_PROD` | `arn:aws:iam::123456789012:role/GitHubActionsDeploymentRole` | IAM role for production deployments |
| `AWS_REGION` | `us-west-2` | AWS region for deployment |
| `AWS_ACCOUNT_ID` | `123456789012` | Your 12-digit AWS account ID |
| `TF_STATE_BUCKET` | `nimbusmart-eks-tfstate-<unique-suffix>` | Globally unique S3 bucket name for Terraform state |
| `TF_STATE_LOCK_TABLE` | `nimbusmart-eks-tflock` | DynamoDB table name for state locking |
| `GRAFANA_ADMIN_PASSWORD` | `YourSecurePassword123!` | Grafana dashboard admin password |

**Important:** The `TF_STATE_BUCKET` must be globally unique across all AWS accounts. Add a random suffix like your name or project ID.

### Phase 2: Bootstrap Terraform State Storage

#### Step 2.1: Run Bootstrap Workflow

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Bootstrap_Script** from the left sidebar
4. Click **Run workflow**
5. In the confirmation box, type: `bootstrap`
6. Click **Run workflow**

This creates:
- S3 bucket for Terraform remote state
- DynamoDB table for state locking
- Versioning and encryption for the S3 bucket

**Duration:** ~2-3 minutes

**Verify:**
```bash
aws s3 ls | grep nimbusmart-eks-tfstate
aws dynamodb list-tables | grep nimbusmart-eks-tflock
```

### Phase 3: Deploy to Test Environment

#### Step 3.1: Push Code to Development Branch

```bash
git checkout development
# Make your code changes
git add .
git commit -m "feat: Add new feature"
git push origin development
```

This triggers the **CI_Development_Sanity** workflow which:
- Validates Docker builds
- Runs `terraform plan` for dev and prod environments
- Ensures no configuration errors

#### Step 3.2: Merge to Test Branch

1. Create a Pull Request from `development` to `test`
2. Review the CI checks (must pass)
3. Merge the PR

This triggers the **Deploy_Test_Environment** workflow which:

**Job 1: Terraform Apply (Dev Infrastructure)**
- Provisions VPC, EKS cluster, RDS, ECR, Secrets Manager, IAM roles
- Duration: ~15-20 minutes

**Job 2: Build and Push Docker Images**
- Builds frontend (Nginx) and backend (FastAPI) Docker images
- Pushes to Amazon ECR with commit SHA tag
- Duration: ~3-5 minutes

**Job 3: Deploy Helm Charts**
- Installs infrastructure components:
  - AWS Load Balancer Controller
  - Cluster Autoscaler
  - Prometheus + Grafana
  - Fluent Bit (logging)
- Deploys NimbusMart application
- Duration: ~5-7 minutes

**Job 4: Smoke Test**
- Waits for ALB DNS assignment
- Hits `/health` endpoint
- Validates deployment success
- Duration: ~2-3 minutes

**Total Duration:** ~25-35 minutes

#### Step 3.3: Verify Test Deployment

After workflow completion, check the workflow logs for:

```
✅ ALB DNS: k8s-ecommerce-ecommerc-xxx.elb.us-west-2.amazonaws.com
🎉 Smoke test passed! Test branch deployed successfully.
```

Test the application:
```bash
# Get the ALB DNS from workflow logs
ALB_URL=$(kubectl get ingress -n ecommerce -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')

# Test health endpoint
curl http://$ALB_URL/health

# Expected response:
# {"status":"ok","database":"connected","version":"1.0.0"}
```

Access the application:
- **Frontend:** `http://<ALB_DNS>/`
- **API Docs:** `http://<ALB_DNS>/docs`
- **Health Check:** `http://<ALB_DNS>/health`

### Phase 4: Deploy to Production

#### Step 4.1: Merge Test to Prod

1. Ensure test environment is stable and all tests pass
2. Create a Pull Request from `test` to `prod`
3. Review changes carefully
4. Merge the PR

This triggers the **Deploy_Prod_Environment** workflow with:
- Production-grade Terraform (Multi-AZ RDS, ON_DEMAND nodes)
- High-availability Helm values (2+ replicas, autoscaling)
- TLS/HTTPS configuration (if ACM certificate provided)
- Enhanced monitoring and logging

**Duration:** ~30-40 minutes

#### Step 4.2: Verify Production Deployment

```bash
# Configure kubectl for prod cluster
aws eks update-kubeconfig --name ecommerce-prod --region us-west-2

# Check all pods are running
kubectl get pods -n ecommerce

# Check ingress
kubectl get ingress -n ecommerce

# Test health endpoint
curl https://<your-domain.com>/health
```

---

## 6. CI/CD Pipeline

### 6.1 Pipeline Overview

```
Code Push → CI Validation → Test Deployment → Production Deployment
   ↓              ↓                ↓                   ↓
 development    Pass/Fail         test                prod
 branch         (Terraform        branch              branch
                Plan + Docker     (Auto-deploy)       (Auto-deploy
                Build)                               with approval)
```

### 6.2 Workflow Details

#### Workflow 1: CI Development Sanity (`ci-development.yml`)

**Trigger:** Push or PR to `development` branch

**Steps:**
1. Checkout code
2. Setup Python and dependencies
3. Run linting and format checks
4. Build Docker images (frontend and backend) - **no push**
5. Terraform init and validate
6. Terraform plan for dev environment
7. Terraform plan for prod environment
8. Upload plan artifacts

**Purpose:** Catch errors early before merging to test

**Duration:** ~5-10 minutes

#### Workflow 2: Deploy Test Environment (`deploy-test.yml`)

**Trigger:** Push/merge to `test` branch

**Jobs:**
1. **terraform-apply**: Provisions AWS dev infrastructure
2. **build-and-push**: Builds and pushes Docker images to ECR
3. **deploy-helm**: Installs infrastructure and application Helm charts
4. **smoke-test**: Validates deployment health

**Duration:** ~25-35 minutes

#### Workflow 3: Deploy Production Environment (`deploy-prod.yml`)

**Trigger:** Push/merge to `prod` branch

**Jobs:**
1. **terraform-apply**: Provisions AWS prod infrastructure (Multi-AZ, ON_DEMAND)
2. **build-and-push**: Builds and pushes production Docker images
3. **deploy-helm**: Installs production Helm charts with HA config
4. **smoke-test**: Validates production deployment

**Duration:** ~30-40 minutes

#### Workflow 4: Destroy Environment (`destroy.yml`)

**Trigger:** Manual workflow dispatch

**Purpose:** Teardown test or prod environment to avoid AWS charges

**Steps:**
1. Uninstall Helm charts (removes ALB)
2. Terraform destroy for selected environment

**Duration:** ~10-15 minutes

#### Workflow 5: Bootstrap Script (`bootstrap.yml`)

**Trigger:** Manual workflow dispatch (run once)

**Purpose:** Create S3 bucket and DynamoDB table for Terraform state

**Duration:** ~2-3 minutes

#### Workflow 6: Bootstrap Destroy (`bootstrap-destroy.yml`)

**Trigger:** Manual workflow dispatch (nuclear option)

**Purpose:** Delete Terraform state storage (only when abandoning project)

**Duration:** ~1-2 minutes

### 6.3 Branch Protection Rules

Configure in GitHub repository settings:

**development branch:**
- Require pull request before merging
- Require status checks to pass (CI workflow)
- Require conversation resolution

**test branch:**
- Require pull request before merging
- Require status checks to pass
- Require review from at least 1 reviewer
- Require conversation resolution

**prod branch:**
- Require pull request before merging
- Require status checks to pass
- Require review from at least 2 reviewers
- Require conversation resolution
- Require signed commits (optional but recommended)

---

## 7. Post-Deployment Verification

### 7.1 Automated Smoke Tests

The deployment workflow automatically runs smoke tests:

```bash
# Test 1: Health endpoint
curl -f http://<ALB_DNS>/health

# Expected: {"status":"ok","database":"connected","version":"1.0.0"}

# Test 2: API documentation
curl -f http://<ALB_DNS>/docs

# Expected: HTML response (Swagger UI)

# Test 3: Products endpoint
curl -f http://<ALB_DNS>/products

# Expected: JSON array of products
```

### 7.2 Manual Verification Checklist

After deployment, verify the following:

#### Kubernetes Resources
```bash
# Check all namespaces
kubectl get namespaces

# Check ecommerce namespace
kubectl get all -n ecommerce

# Expected output:
# NAME                                    READY   STATUS    RESTARTS   AGE
# pod/ecommerce-backend-xxx               1/1     Running   0          5m
# pod/ecommerce-frontend-xxx              1/1     Running   0          5m

# Check ingress
kubectl get ingress -n ecommerce

# Expected: ADDRESS field should show ALB DNS name
```

#### AWS Resources
```bash
# Check EKS cluster
aws eks describe-cluster --name ecommerce-dev --query 'cluster.[name,status,version]' --output table

# Check RDS instance
aws rds describe-db-instances --db-instance-identifier ecommerce-dev-postgres --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,Endpoint.Address]' --output table

# Check ECR repositories
aws ecr describe-repositories --query 'repositories[*].[repositoryName,repositoryUri]' --output table

# Check Secrets Manager secret
aws secretsmanager get-secret-value --secret-id dev/ecommerce/db --query 'SecretString' --output text
```

#### Application Functionality
```bash
# Test product listing
curl http://<ALB_DNS>/products

# Test creating a product (requires authentication in production)
curl -X POST http://<ALB_DNS>/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":19.99,"stock":10,"category":"Test"}'

# Test cart operations
curl http://<ALB_DNS>/cart -H "X-Session-ID: test-session-123"
```

### 7.3 Monitoring Verification

#### Access Grafana Dashboard
```bash
# Port-forward Grafana service
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80

# Open browser to http://localhost:3000
# Login with:
#   Username: admin
#   Password: <GRAFANA_ADMIN_PASSWORD from GitHub secrets>
```

**Verify Dashboards:**
- Kubernetes cluster metrics (CPU, memory, network)
- Node resource utilization
- Pod resource usage
- EKS cluster autoscaler metrics

#### Check CloudWatch Logs
```bash
# View backend logs
aws logs tail /aws/containerinsights/ecommerce-dev/application --follow --log-stream-name-prefix backend

# View frontend logs
aws logs tail /aws/containerinsights/ecommerce-dev/application --follow --log-stream-name-prefix frontend
```

---

## 8. Rollback Procedures

### 8.1 Application Rollback

If a deployment introduces issues, rollback using Helm:

```bash
# List release history
helm history ecommerce -n ecommerce

# Rollback to previous version
helm rollback ecommerce <REVISION_NUMBER> -n ecommerce

# Example: Rollback to revision 2
helm rollback ecommerce 2 -n ecommerce

# Verify rollback
kubectl rollout status deployment/backend -n ecommerce
kubectl rollout status deployment/frontend -n ecommerce
```

### 8.2 Infrastructure Rollback

If Terraform changes cause issues:

```bash
# Navigate to terraform directory
cd terraform/environments/dev

# Initialize Terraform
terraform init

# Review current state
terraform show

# Rollback to previous state (if state is in S3)
terraform state pull > backup.tfstate

# Import previous state (if needed)
terraform import module.eks.aws_eks_cluster.this <cluster-name>

# Or manually update terraform.tfvars to previous values and apply
terraform apply -var-file="terraform.tfvars"
```

**Note:** Terraform does not have built-in rollback. You must manually revert configuration changes and re-apply.

### 8.3 Database Rollback

**Warning:** Database rollbacks are complex and should be done carefully.

```bash
# Option 1: Restore from RDS snapshot (if automated backups enabled)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ecommerce-dev-postgres-restored \
  --db-snapshot-identifier rds:ecommerce-dev-postgres-2024-01-01-00-00

# Option 2: Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier ecommerce-dev-postgres \
  --target-db-instance-identifier ecommerce-dev-postgres-restored \
  --restore-time 2024-01-01T00:00:00Z
```

### 8.4 Emergency Teardown

If you need to completely remove the environment:

```bash
# Option 1: Use GitHub Actions workflow
# Go to Actions → Destroy_Environment → Run workflow
# Select environment: test or prod
# Confirm: destroy-test or destroy-prod

# Option 2: Manual teardown
# Uninstall Helm charts
helm uninstall ecommerce -n ecommerce
helm uninstall aws-load-balancer-controller -n kube-system
helm uninstall cluster-autoscaler -n kube-system
helm uninstall prometheus -n monitoring
helm uninstall fluent-bit -n logging

# Destroy Terraform resources
cd terraform/environments/dev
terraform destroy -var-file="terraform.tfvars" -auto-approve
```

---

## 9. Monitoring and Logging

### 9.1 Application Monitoring

#### Health Checks

**Liveness Probe:** `/health`
- Checks database connectivity
- Returns application version
- Used by Kubernetes to restart unhealthy pods

**Readiness Probe:** `/health`
- Same as liveness
- Determines if pod can receive traffic

**Startup Probe:** `/health`
- Allows slow-starting pods to initialize
- Prevents premature restarts

#### Key Metrics to Monitor

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| API Response Time | Prometheus | > 500ms (p95) |
| Error Rate | Prometheus | > 1% |
| Database Connections | RDS | > 80% of max |
| Pod Restarts | Kubernetes | > 3 in 5 minutes |
| CPU Utilization | Kubernetes | > 80% |
| Memory Utilization | Kubernetes | > 85% |
| ALB Request Count | CloudWatch | Sudden drop = 0 |
| ALB 5xx Errors | CloudWatch | > 5% |

### 9.2 Log Management

#### Log Locations

**CloudWatch Log Groups:**
- `/aws/containerinsights/ecommerce-dev/application` (Test)
- `/aws/containerinsights/ecommerce-prod/application` (Production)

**Log Streams:**
- `backend-<pod-name>`: Backend application logs
- `frontend-<pod-name>`: Nginx access and error logs

#### Query Logs

```bash
# Tail logs in real-time
aws logs tail /aws/containerinsights/ecommerce-dev/application --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/containerinsights/ecommerce-dev/application \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000)

# Get logs for specific pod
POD_NAME=$(kubectl get pods -n ecommerce -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl logs $POD_NAME -n ecommerce --tail=100
```

### 9.3 Grafana Dashboards

Access Grafana:
```bash
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80
# Open http://localhost:3000
```

**Default Dashboards:**
- **Kubernetes Cluster:** CPU, memory, network, disk usage
- **Kubernetes Pods:** Per-pod resource utilization
- **Kubernetes Deployments:** Deployment status and replica counts
- **Node Exporter:** Node-level metrics
- **Prometheus Stats:** Prometheus internal metrics

**Custom Dashboards to Create:**
1. **Application Performance:**
   - Request rate (RPS)
   - Response time (p50, p95, p99)
   - Error rate (4xx, 5xx)

2. **Business Metrics:**
   - Products created per hour
   - Cart operations per hour
   - Active sessions

3. **Infrastructure:**
   - EKS node count
   - RDS connections
   - ALB request count

### 9.4 Alerting

Set up alerts in CloudWatch or Grafana:

```yaml
# Example CloudWatch Alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name "ecommerce-backend-high-cpu" \
  --metric-name cpu_utilization \
  --namespace AWS/EKS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ClusterName,Value=ecommerce-dev \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-west-2:123456789012:alerts
```

---

## 10. Troubleshooting

### 10.1 Common Issues

#### Issue 1: Terraform Apply Fails

**Symptom:** Workflow fails during `terraform apply`

**Possible Causes:**
- Insufficient IAM permissions
- State lock conflict
- Resource already exists

**Solutions:**
```bash
# Check IAM permissions
aws iam get-user
aws iam list-attached-user-policies --user-name <username>

# Force unlock state (if stuck)
aws dynamodb delete-item \
  --table-name nimbusmart-eks-tflock \
  --key '{"LockID": {"S": "terraform/environments/dev/terraform.tfstate"}}'

# Retry with debug logging
cd terraform/environments/dev
TF_LOG=DEBUG terraform apply -var-file="terraform.tfvars"
```

#### Issue 2: EKS Nodes Not Joining Cluster

**Symptom:** `kubectl get nodes` shows no nodes or NotReady status

**Possible Causes:**
- IAM instance profile missing
- Security group misconfiguration
- Subnet tags incorrect

**Solutions:**
```bash
# Check node group status
aws eks describe-nodegroup \
  --cluster-name ecommerce-dev \
  --nodegroup-name ecommerce-dev-ng

# Verify subnet tags
aws ec2 describe-subnets \
  --filters "Name=tag:kubernetes.io/role/elb,Values=1"

# Check CloudFormation stack events
aws cloudformation describe-stack-events \
  --stack-name eksctl-ecommerce-dev-nodegroup

# Check node logs (if node is running)
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
ssh -i <key.pem> ec2-user@$NODE_IP "sudo journalctl -u kubelet -f"
```

#### Issue 3: Pods Stuck in Pending State

**Symptom:** `kubectl get pods` shows pods in `Pending` status

**Possible Causes:**
- Insufficient resources
- PVC not bound
- Node selector/taint mismatch

**Solutions:**
```bash
# Check pod events
kubectl describe pod <pod-name> -n ecommerce

# Check node resources
kubectl describe nodes

# Check PVC status
kubectl get pvc -n ecommerce

# Check cluster autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler

# Manually scale node group
aws eks update-nodegroup-config \
  --cluster-name ecommerce-dev \
  --nodegroup-name ecommerce-dev-ng \
  --scaling-config minSize=2,maxSize=5,desiredSize=3
```

#### Issue 4: ALB Not Provisioning

**Symptom:** Ingress has no ADDRESS field after 10+ minutes

**Possible Causes:**
- AWS Load Balancer Controller not running
- Subnet tags missing
- Security group rules incorrect

**Solutions:**
```bash
# Check ALB controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Verify controller is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Check ingress events
kubectl describe ingress ecommerce-ingress -n ecommerce

# Verify subnet tags
aws ec2 describe-subnets \
  --filters "Name=tag:kubernetes.io/role/elb,Values=1" \
  --query 'Subnets[*].[SubnetId,Tags[?Key==`Name`].Value|[0]]' \
  --output table

# Check security groups
kubectl get svc -n kube-system aws-load-balancer-controller-webhook-service -o yaml
```

#### Issue 5: Backend Cannot Connect to RDS

**Symptom:** Health check fails with database connection error

**Possible Causes:**
- RDS security group not allowing EKS node SG
- Database credentials incorrect
- RDS not publicly accessible (expected)

**Solutions:**
```bash
# Check RDS security group
aws ec2 describe-security-groups \
  --group-ids <rds-sg-id> \
  --query 'SecurityGroups[0].IpPermissions'

# Verify EKS node SG
aws ec2 describe-security-groups \
  --group-ids <eks-node-sg-id> \
  --query 'SecurityGroups[0].GroupId'

# Test database connection from within cluster
kubectl run db-test --image=postgres:14 -it --rm --restart=Never -n ecommerce -- \
  psql -h <rds-endpoint> -U ecommerceadmin -d ecommerce -c "SELECT 1;"

# Check secrets in Kubernetes
kubectl get secret ecommerce-db-credentials -n ecommerce -o yaml

# Verify IRSA role annotation
kubectl get serviceaccount backend-sa -n ecommerce -o yaml
```

#### Issue 6: Docker Image Pull Fails

**Symptom:** Pods show `ImagePullBackOff` or `ErrImagePull`

**Possible Causes:**
- ECR repository doesn't exist
- Image not pushed to ECR
- IAM permissions missing for ECR access

**Solutions:**
```bash
# Check ECR repositories
aws ecr describe-repositories

# Verify image exists
aws ecr list-images --repository-name ecommerce-backend

# Check pod events
kubectl describe pod <pod-name> -n ecommerce | grep -A 10 Events

# Test ECR login
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com

# Pull image manually
docker pull <account-id>.dkr.ecr.us-west-2.amazonaws.com/ecommerce-backend:<tag>
```

### 10.2 Debugging Commands Cheat Sheet

```bash
# Kubernetes debugging
kubectl get pods -n ecommerce
kubectl describe pod <pod-name> -n ecommerce
kubectl logs <pod-name> -n ecommerce --tail=100
kubectl exec -it <pod-name> -n ecommerce -- /bin/bash
kubectl get events -n ecommerce --sort-by='.lastTimestamp'

# Terraform debugging
cd terraform/environments/dev
terraform show
terraform state list
terraform state show <resource>
terraform plan -var-file="terraform.tfvars"

# AWS debugging
aws eks describe-cluster --name ecommerce-dev
aws rds describe-db-instances --db-instance-identifier ecommerce-dev-postgres
aws ecs list-tasks --cluster ecommerce-dev  # If using ECS
aws logs tail /aws/containerinsights/ecommerce-dev/application --follow

# Network debugging
kubectl run curl-test --image=curlimages/curl -it --rm --restart=Never -n ecommerce -- curl -v http://backend-service:8000/health
kubectl run nettest --image=busybox -it --rm --restart=Never -n ecommerce -- nslookup backend-service
```

---

## 11. Security Considerations

### 11.1 Security Best Practices

#### 1. Secrets Management
- **Never** hardcode credentials in Docker images or code
- Use AWS Secrets Manager for all sensitive data
- Rotate database passwords regularly (Terraform handles this on re-apply)
- Use IRSA (IAM Roles for Service Accounts) instead of AWS keys in pods

#### 2. Network Security
- RDS deployed in private subnets (no public access)
- Security groups restrict traffic to necessary ports only
- ALB is the only public-facing component
- EKS nodes in private subnets with NAT gateway for outbound traffic

#### 3. Access Control
- Use GitHub OIDC for AWS authentication (no long-lived credentials)
- Implement least-privilege IAM policies
- Enable MFA on AWS root account
- Use separate IAM users/roles for different environments

#### 4. Container Security
- Scan Docker images for vulnerabilities (use `docker scan`)
- Use minimal base images (Alpine Linux)
- Run containers as non-root user
- Implement resource limits (CPU/memory) to prevent DoS
- Use read-only root filesystem where possible

#### 5. Data Protection
- Enable encryption at rest for RDS
- Enable encryption in transit (TLS/HTTPS) in production
- Enable RDS automated backups and snapshots
- Use AWS KMS for encryption keys

### 11.2 Compliance Checklist

- [ ] AWS IAM MFA enabled for all users
- [ ] S3 bucket versioning and encryption enabled
- [ ] RDS encryption at rest enabled
- [ ] CloudTrail enabled for audit logging
- [ ] Security groups follow least-privilege principle
- [ ] No hardcoded credentials in code or images
- [ ] Docker images scanned for vulnerabilities
- [ ] TLS/HTTPS enabled in production
- [ ] Regular security patches applied to nodes
- [ ] Backup and restore procedures tested

### 11.3 Security Monitoring

Enable AWS security services:

```bash
# Enable GuardDuty (threat detection)
aws guardduty create-detector --enable --finding-publishing-frequency FIFTEEN_MINUTES

# Enable Security Hub
aws securityhub create-hub

# Enable Config (compliance auditing)
aws configservice put-configuration-recorder --configuration-recorder name=default,roleARN=arn:aws:iam::123456789012:role/config-role

# Enable RDS encryption (if not already)
aws rds modify-db-instance \
  --db-instance-identifier ecommerce-dev-postgres \
  --storage-encrypted \
  --apply-immediately
```

---

## Appendix A: Terraform Variables Reference

### terraform/environments/dev/terraform.tfvars

```hcl
# Network
vpc_cidr = "10.0.0.0/16"

# EKS
kubernetes_version = "1.29"
node_instance_type = "t3.medium"

# RDS
db_instance_class = "db.t3.micro"
db_name = "ecommerce"
db_username = "ecommerceadmin"
# db_password is auto-generated by random_password resource

# Tags
tags = {
  Environment = "dev"
  Project     = "nimbusmart"
  ManagedBy   = "terraform"
}
```

### terraform/environments/prod/terraform.tfvars

```hcl
# Network
vpc_cidr = "10.1.0.0/16"

# EKS
kubernetes_version = "1.29"
node_instance_type = "t3.large"

# RDS
db_instance_class = "db.t3.small"
db_name = "ecommerce"
db_username = "ecommerceadmin"
# db_password is auto-generated by random_password resource

# Tags
tags = {
  Environment = "prod"
  Project     = "nimbusmart"
  ManagedBy   = "terraform"
}
```

---

## Appendix B: Helm Values Reference

### Key Configuration Parameters

```yaml
# Global settings
global:
  environment: dev  # or prod
  awsRegion: us-west-2

# Frontend
frontend:
  replicaCount: 1  # 2 for prod
  image:
    repository: <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/ecommerce-frontend
    tag: latest
  autoscaling:
    enabled: false  # true for prod

# Backend
backend:
  replicaCount: 1  # 2 for prod
  image:
    repository: <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/ecommerce-backend
    tag: latest
  env:
    dbSecretName: "dev/ecommerce/db"  # "prod/ecommerce/db" for prod
    allowedOrigins: "*"  # "https://yourdomain.com" for prod
  autoscaling:
    enabled: false  # true for prod

# Ingress
ingress:
  enabled: true
  scheme: internet-facing
  certificateArn: ""  # ACM certificate ARN for prod
  host: ""  # yourdomain.com for prod
```

---

## Appendix C: Useful Commands

### Deployment Commands

```bash
# Trigger manual deployment
gh workflow run deploy-test.yml -f environment=test

# Check workflow status
gh run list --workflow=deploy-test.yml

# View workflow logs
gh run view <run-id> --log

# Rollback Helm release
helm rollback ecommerce <revision> -n ecommerce

# Upgrade Helm release
helm upgrade ecommerce ./helm/ecommerce \
  -n ecommerce \
  -f helm/ecommerce/values.yaml \
  -f helm/ecommerce/values-dev.yaml \
  --set frontend.image.tag=<new-tag>
```

### Monitoring Commands

```bash
# Port-forward Grafana
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80

# Tail application logs
kubectl logs -f deployment/backend -n ecommerce

# Check resource usage
kubectl top pods -n ecommerce
kubectl top nodes

# Get pod metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods -n ecommerce
```

### Cleanup Commands

```bash
# Delete test environment
gh workflow run destroy.yml -f environment=test

# Delete all Helm releases
helm uninstall ecommerce -n ecommerce
helm uninstall prometheus -n monitoring
helm uninstall fluent-bit -n logging

# Destroy Terraform resources
cd terraform/environments/dev
terraform destroy -var-file="terraform.tfvars" -auto-approve
```

---

## Appendix D: Cost Estimation

### Monthly AWS Costs (Estimated)

**Development Environment:**
- EKS Cluster: ~$72/month
- EC2 Instances (3x t3.medium SPOT): ~$30/month
- RDS (db.t3.micro, single-AZ): ~$15/month
- ALB: ~$20/month
- Data Transfer: ~$5/month
- **Total: ~$142/month**

**Production Environment:**
- EKS Cluster: ~$72/month
- EC2 Instances (3x t3.large ON_DEMAND): ~$200/month
- RDS (db.t3.small, Multi-AZ): ~$120/month
- ALB: ~$25/month
- Data Transfer: ~$20/month
- CloudWatch Logs: ~$10/month
- **Total: ~$447/month**

**Cost Optimization Tips:**
1. Use SPOT instances for non-production environments (saves 70%)
2. Enable RDS stop/start for dev databases (saves 50%)
3. Set up S3 lifecycle policies for logs
4. Use CloudWatch log retention policies (7 days for dev, 30 days for prod)
5. Schedule EKS node scaling (scale down at night for dev)

---

## Appendix E: Support and Resources

### Documentation Links

- **Terraform Documentation:** https://www.terraform.io/docs
- **AWS EKS Documentation:** https://docs.aws.amazon.com/eks/
- **Helm Documentation:** https://helm.sh/docs/
- **GitHub Actions Documentation:** https://docs.github.com/en/actions
- **FastAPI Documentation:** https://fastapi.tiangolo.com/

### Internal Documentation

- `NimbusMart_AWS_Deployment_Guide.md` - Architecture and design decisions
- `implementaion.md` - CI/CD implementation plan
- `README.md` - Project overview

### Getting Help

1. Check workflow logs in GitHub Actions
2. Review CloudWatch logs for application errors
3. Check Grafana dashboards for metrics
4. Consult this troubleshooting guide
5. Review Terraform state: `terraform show`

---

**End of Deployment Documentation**