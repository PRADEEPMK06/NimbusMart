# NimbusMart Documentation

This directory contains comprehensive deployment and configuration management documentation for the NimbusMart e-commerce platform.

## 📚 Documentation Files

### 1. Deployment_Documentation.md
**Comprehensive deployment guide covering:**
- Prerequisites and tool installation
- AWS account setup and configuration
- Architecture overview (EKS, RDS, ALB, etc.)
- Step-by-step deployment instructions
- 3-branch GitFlow deployment strategy
- CI/CD pipeline details
- Post-deployment verification
- Rollback procedures
- Monitoring and logging setup
- Troubleshooting guide
- Security considerations
- Cost estimation

**Key Sections:**
- Phase 1: One-Time AWS Setup (OIDC, IAM roles, GitHub secrets)
- Phase 2: Bootstrap Terraform State
- Phase 3: Deploy to Test Environment
- Phase 4: Deploy to Production
- Complete CI/CD workflow details
- Emergency procedures and disaster recovery

### 2. Configuration_Management_Documentation.md
**Complete configuration management reference:**
- Configuration architecture and layers
- Environment-specific configurations (dev/prod)
- Secrets management (AWS Secrets Manager, IRSA)
- Terraform configuration files reference
- Helm values and overrides
- Application configuration (backend/frontend)
- GitHub Actions configuration
- Configuration best practices
- Change management procedures
- Configuration validation
- Disaster recovery procedures

**Key Sections:**
- Multi-layer configuration architecture
- Terraform variables and outputs
- Helm values for each environment
- IRSA and secrets management
- Configuration change process
- Validation and testing procedures
- Backup and recovery procedures

### 3. convert_to_docx.py
**Python script to convert markdown files to DOCX format**

## 🚀 Quick Start

### Converting to DOCX Format

Since you requested .docx files, here are multiple methods to convert the markdown documentation:

#### Method 1: Using Python Script (Recommended)

1. **Install Python dependencies:**
   ```bash
   pip install python-docx
   ```

2. **Run the conversion script:**
   ```bash
   python docs/convert_to_docx.py
   ```

3. **Output files:**
   - `docs/Deployment_Documentation.docx`
   - `docs/Configuration_Management_Documentation.docx`

#### Method 2: Using Pandoc (If Available)

```bash
# Install Pandoc
# Windows: choco install pandoc
# Mac: brew install pandoc
# Linux: sudo apt-get install pandoc

# Convert files
pandoc docs/Deployment_Documentation.md -o docs/Deployment_Documentation.docx
pandoc docs/Configuration_Management_Documentation.md -o docs/Configuration_Management_Documentation.docx
```

#### Method 3: Online Conversion

1. Go to https://cloudconvert.com/md-to-docx
2. Upload the .md files
3. Download the converted .docx files

#### Method 4: VS Code Extension

1. Install "Markdown All in One" extension in VS Code
2. Open the .md file
3. Right-click → "Export (pdf, html, png, jpeg, webp)"
4. Choose DOCX format (if available) or export to PDF

## 📋 Documentation Structure

```
docs/
├── Deployment_Documentation.md              # Main deployment guide
├── Configuration_Management_Documentation.md # Configuration reference
├── convert_to_docx.py                       # MD to DOCX converter
└── README.md                                # This file
```

## 🎯 What You Need to Change for Deployment

### 1. GitHub Repository Configuration

**Create these secrets in GitHub (Settings → Secrets → Actions):**

| Secret | Value | Description |
|--------|-------|-------------|
| `AWS_ROLE_ARN` | `arn:aws:iam::YOUR_ACCOUNT:role/GitHubActionsDeploymentRole` | IAM role for deployments |
| `AWS_ROLE_ARN_PROD` | Same as above or different role | Production IAM role |
| `AWS_REGION` | `us-west-2` | AWS region |
| `AWS_ACCOUNT_ID` | `123456789012` | Your 12-digit AWS account ID |
| `TF_STATE_BUCKET` | `nimbusmart-eks-tfstate-YOURNAME` | Globally unique S3 bucket name |
| `TF_STATE_LOCK_TABLE` | `nimbusmart-eks-tflock` | DynamoDB table name |
| `GRAFANA_ADMIN_PASSWORD` | `YourSecurePassword123!` | Grafana admin password |

### 2. AWS IAM Setup

**Create OIDC Provider:**
```bash
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"
```

**Create IAM Role:**
```bash
# Update trust-policy.json with your details
aws iam create-role \
  --role-name "GitHubActionsDeploymentRole" \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name "GitHubActionsDeploymentRole" \
  --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"
```

### 3. Terraform Configuration

**Update these files with your values:**

- `terraform/environments/dev/terraform.tfvars`
  - Change `vpc_cidr` if needed
  - Update `tags` with your project info

- `terraform/environments/prod/terraform.tfvars`
  - Change `vpc_cidr` if needed
  - Update `node_instance_type` for production
  - Update `db_instance_class` for production
  - Update `tags` with your project info

### 4. Helm Configuration

**Update these files:**

- `helm/ecommerce/values-dev.yaml`
  - Replace `<AWS_ACCOUNT_ID>` with your actual AWS account ID
  - Update `subnets` and `securityGroups` after first deployment

- `helm/ecommerce/values-prod.yaml`
  - Replace `<AWS_ACCOUNT_ID>` with your actual AWS account ID
  - Update `certificateArn` with your ACM certificate ARN
  - Update `host` with your production domain
  - Update `subnets` and `securityGroups` after first deployment

### 5. GitHub Repository Setup

**Create required branches:**
```bash
git checkout -b development
git checkout -b test
git checkout -b prod
git push -u origin development test prod
```

**Configure branch protection:**
- Go to Settings → Branches → Add rule
- Enable "Require pull request before merging"
- Enable "Require status checks to pass"
- Set required reviewers (1 for test, 2 for prod)

## 🔄 Deployment Workflow

```
1. Push code to 'development' branch
   ↓
2. CI runs (Terraform plan, Docker build)
   ↓
3. Create PR: development → test
   ↓
4. Merge PR → Auto-deploy to test environment
   ↓
5. Verify test environment
   ↓
6. Create PR: test → prod
   ↓
7. Merge PR → Auto-deploy to production
   ↓
8. Verify production deployment
```

## 📊 Environment Comparison

| Aspect | Test (Dev) | Production |
|--------|-----------|------------|
| **EKS Nodes** | SPOT (t3.medium) | ON_DEMAND (t3.large) |
| **Node Count** | 1-3 nodes | 2-10 nodes |
| **RDS** | Single AZ, db.t3.micro | Multi-AZ, db.t3.small |
| **Replicas** | 1 each | 2+ each |
| **Autoscaling** | Disabled | Enabled |
| **TLS** | HTTP only | HTTPS with ACM cert |
| **Cost** | ~$142/month | ~$447/month |

## 🔐 Security Checklist

- [ ] OIDC provider created in AWS
- [ ] IAM role created with correct trust policy
- [ ] GitHub secrets configured
- [ ] Terraform state bucket created (via bootstrap workflow)
- [ ] No hardcoded credentials in code
- [ ] IRSA configured for backend pods
- [ ] RDS in private subnets
- [ ] Security groups follow least privilege
- [ ] CloudWatch logging enabled
- [ ] TLS/HTTPS configured for production

## 📖 Additional Resources

### Internal Documentation
- `NimbusMart_AWS_Deployment_Guide.md` - Original architecture guide
- `implementaion.md` - CI/CD implementation plan
- `README.md` - Project overview

### External Documentation
- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Helm Documentation](https://helm.sh/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## 🆘 Support

If you encounter issues:

1. **Check GitHub Actions logs** - Detailed error messages
2. **Review CloudWatch logs** - Application errors
3. **Check Grafana dashboards** - Metrics and alerts
4. **Consult troubleshooting section** in Deployment_Documentation.md
5. **Verify Terraform state** - `terraform show`

## 📝 Notes

- All configuration is version-controlled in Git
- Secrets are never committed to Git
- Each environment is completely isolated
- Changes follow GitFlow workflow
- Automated testing at each stage
- Rollback procedures documented for all scenarios

---

**Generated:** July 2026  
**Version:** 1.0  
**Project:** NimbusMart E-Commerce Platform