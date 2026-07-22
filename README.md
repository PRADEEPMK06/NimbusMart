# NimbusMart - Production-Ready Cloud Deployment Platform

A complete, enterprise-grade platform for deploying GitHub repositories to Kubernetes with automatic CI/CD, monitoring, and observability.

## 🚀 Features

- **One-Click Deployment**: Deploy any GitHub repository to Kubernetes in minutes
- **Automatic Technology Detection**: Supports Python, Node.js, React, and static sites
- **Docker Image Management**: Automatic building and pushing to Amazon ECR
- **Kubernetes Orchestration**: Production-ready deployments with auto-scaling
- **Built-in Monitoring**: Prometheus, Grafana, Loki, and Tempo
- **Cost Optimization**: AWS Free Tier compatible with auto-scaling
- **Security First**: JWT authentication, RBAC, network policies, and secrets management
- **GitOps Ready**: Infrastructure as Code with Terraform and Helm

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS CloudFront (CDN)                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Load Balancer (ALB)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌──────────────────────┐         ┌──────────────────────┐
│   Frontend (Nginx)   │         │   Backend (FastAPI)  │
│   React SPA          │         │   Python API         │
└──────────────────────┘         └──────────────────────┘
            │                               │
            │                               ▼
            │                  ┌──────────────────────┐
            │                  │   PostgreSQL (RDS)   │
            │                  │   Database           │
            │                  └──────────────────────┘
            │                               │
            ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Amazon EKS Cluster                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Namespace: ecommerce                                │  │
│  │  - Frontend Deployment (2-10 replicas)               │  │
│  │  - Backend Deployment (2-10 replicas)                │  │
│  │  - HPA (Auto-scaling)                                │  │
│  │  - Network Policies                                  │  │
│  │  - Pod Disruption Budget                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Monitoring Stack                                │
│  - Prometheus (Metrics)                                     │
│  - Grafana (Dashboards)                                     │
│  - Loki (Logs)                                              │
│  - Tempo (Traces)                                           │
│  - AlertManager (Alerts)                                    │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
.
├── apps/
│   ├── backend/                 # FastAPI backend
│   │   ├── main.py             # Application entry point
│   │   ├── auth.py             # Authentication logic
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── schemas.py          # Pydantic schemas
│   │   ├── requirements.txt    # Python dependencies
│   │   ├── Dockerfile          # Multi-stage Docker build
│   │   └── .env.example        # Environment variables template
│   │
│   └── frontend/               # React frontend
│       ├── src/
│       │   ├── components/     # Reusable components
│       │   ├── pages/          # Page components
│       │   ├── contexts/       # React contexts
│       │   ├── services/       # API services
│       │   └── types/          # TypeScript types
│       ├── package.json        # Node dependencies
│       ├── Dockerfile          # Multi-stage Docker build
│       └── nginx.conf          # Nginx configuration
│
├── terraform/
│   ├── modules/                # Reusable Terraform modules
│   │   ├── vpc/               # VPC, subnets, routing
│   │   ├── eks/               # EKS cluster, nodes
│   │   ├── ecr/               # ECR repositories
│   │   ├── rds/               # RDS PostgreSQL
│   │   ├── iam/               # IAM roles, IRSA
│   │   └── secrets-manager/   # Secrets Manager
│   └── environments/
│       └── main/              # Main environment config
│           ├── main.tf        # Main configuration
│           ├── variables.tf   # Input variables
│           ├── outputs.tf     # Output values
│           └── terraform.tfvars # Variable values
│
├── helm/
│   └── ecommerce/              # Helm chart for application
│       ├── Chart.yaml         # Chart metadata
│       ├── values.yaml        # Default values
│       ├── values-main.yaml   # Main environment values
│       └── templates/         # Kubernetes manifests
│           ├── deployment-frontend.yaml
│           ├── deployment-backend.yaml
│           ├── service-frontend.yaml
│           ├── service-backend.yaml
│           ├── ingress.yaml
│           ├── hpa-frontend.yaml
│           ├── hpa-backend.yaml
│           ├── networkpolicy.yaml
│           ├── poddisruptionbudget.yaml
│           ├── configmap.yaml
│           ├── secret.yaml
│           ├── serviceaccount.yaml
│           └── namespace.yaml
│
├── .github/
│   └── workflows/              # GitHub Actions CI/CD
│       ├── deploy-main.yml    # Deploy to main branch
│       ├── ci-development.yml # CI for development
│       └── destroy.yml        # Destroy infrastructure
│
├── docs/
│   ├── System_Architecture_and_Design.docx  # Complete architecture doc
│   └── Configuration_Guide.docx             # Configuration reference
│
└── README.md                   # This file
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Vite** - Build tool
- **React Router v6** - Routing
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

### Backend
- **FastAPI** - Web framework
- **SQLAlchemy 2.0** - ORM
- **PostgreSQL 15** - Database
- **Redis** - Cache and task queue
- **Celery** - Distributed task queue
- **JWT** - Authentication
- **Boto3** - AWS SDK
- **Prometheus Client** - Metrics

### Infrastructure
- **Terraform** - Infrastructure as Code
- **Amazon EKS** - Kubernetes
- **Amazon ECR** - Container registry
- **Amazon RDS** - Managed PostgreSQL
- **AWS Secrets Manager** - Secrets management
- **Application Load Balancer** - Load balancing
- **Route53** - DNS
- **ACM** - SSL certificates

### Monitoring
- **Prometheus** - Metrics collection
- **Grafana** - Dashboards
- **Loki** - Log aggregation
- **Tempo** - Distributed tracing
- **AlertManager** - Alerting

## 🚀 Quick Start

### Prerequisites

- AWS Account (Free Tier eligible)
- GitHub Account
- Terraform >= 1.0
- Helm >= 3.0
- kubectl
- AWS CLI
- Docker

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/nimbusmart.git
cd nimbusmart
```

### 2. Configure AWS Credentials

```bash
aws configure
# OR
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

### 3. Create Terraform State Resources

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket --bucket nimbusmart-terraform-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning --bucket nimbusmart-terraform-state --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption --bucket nimbusmart-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name nimbusmart-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 4. Configure Terraform Variables

```bash
cd terraform/environments/main
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 5. Deploy Infrastructure

```bash
cd terraform/environments/main
terraform init
terraform plan
terraform apply
```

### 6. Configure GitHub Secrets

Add these secrets to your GitHub repository:

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `GITHUB_TOKEN` - GitHub personal access token
- `DB_PASSWORD` - Database password

### 7. Deploy Application

```bash
# Get ECR repository URLs
ECR_BACKEND=$(terraform output -raw ecr_backend_url)
ECR_FRONTEND=$(terraform output -raw ecr_frontend_url)

# Update Helm values
helm upgrade --install ecommerce ./helm/ecommerce \
  --namespace ecommerce --create-namespace \
  --set frontend.image.repository=$ECR_FRONTEND \
  --set backend.image.repository=$ECR_BACKEND \
  -f helm/ecommerce/values-main.yaml
```

### 8. Access the Application

```bash
# Get ALB URL
kubectl get ingress -n ecommerce

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Open http://localhost:3000
```

## 📊 Monitoring

### Grafana Dashboards

Access Grafana at `http://<alb-url>/grafana` (if exposed) or via port-forward:

```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

Default credentials:
- Username: `admin`
- Password: (set during deployment)

### Prometheus

```bash
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
# Open http://localhost:9090
```

### Loki (Logs)

```bash
kubectl port-forward -n monitoring svc/loki 3100:3100
```

## 🔒 Security

### Authentication
- JWT-based authentication
- GitHub OAuth integration
- Role-based access control (Admin, Developer, Viewer)

### Network Security
- VPC with public/private subnets
- Security groups for RDS and EKS
- Network policies in Kubernetes
- No public RDS access

### Container Security
- Image scanning with ECR
- Non-root containers
- Read-only root filesystem
- Dropped capabilities

### Infrastructure Security
- IAM least privilege
- IRSA for pod-level permissions
- Secrets Manager for credentials
- Encrypted storage (EBS, RDS, S3)
- CloudTrail audit logging

## 💰 Cost Optimization

### AWS Free Tier (First 12 Months)
- EKS: 1 cluster free
- EC2: 750 hours/month of t2/t3.micro
- RDS: 750 hours/month of db.t3.micro
- ALB: 750 hours/month
- Data Transfer: 100GB/month

### Cost Saving Tips
1. Use auto-scaling to reduce idle resources
2. Use t3.medium instances (Free Tier eligible)
3. Enable ECR lifecycle policies
4. Use S3 Intelligent-Tiering for logs
5. Monitor costs with AWS Budgets

## 🔧 Configuration

See [Configuration Guide](docs/Configuration_Guide.docx) for detailed configuration options.

### Key Configuration Files

- `terraform/environments/main/terraform.tfvars` - Infrastructure variables
- `helm/ecommerce/values-main.yaml` - Application deployment values
- `apps/backend/.env.example` - Backend environment variables

## 🧪 Testing

### Backend Tests

```bash
cd apps/backend
python -m pytest tests/ -v
```

### Frontend Tests

```bash
cd apps/frontend
npm test
```

### Infrastructure Tests

```bash
cd terraform
terraform validate
terraform plan
```

## 📈 Scaling

### Horizontal Scaling
- HPA for frontend and backend (2-10 replicas)
- Cluster Autoscaler for EKS nodes (2-6 nodes)

### Vertical Scaling
- Increase node instance types
- Upgrade RDS instance class
- Add more EKS nodes

### Multi-Region (Future)
- Deploy to multiple regions
- Route53 health checks
- Cross-region replication

## 🚨 Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod <pod-name> -n ecommerce
   kubectl logs <pod-name> -n ecommerce
   ```

2. **Database connection issues**
   ```bash
   kubectl get secret -n ecommerce
   kubectl describe secret ecommerce-db-credentials -n ecommerce
   ```

3. **ALB not accessible**
   ```bash
   kubectl get ingress -n ecommerce
   kubectl describe ingress -n ecommerce
   ```

### Logs

```bash
# Application logs
kubectl logs -n ecommerce -l app=ecommerce -c backend

# Kubernetes events
kubectl get events -n ecommerce --sort-by='.lastTimestamp'

# Terraform logs
export TF_LOG=DEBUG
terraform apply
```

## 📚 Documentation

- [System Architecture & Design](docs/System_Architecture_and_Design.docx) - Complete architecture documentation
- [Configuration Guide](docs/Configuration_Guide.docx) - Detailed configuration reference
- [Deployment Guide](docs/Deployment_Guide.md) - Step-by-step deployment instructions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

NimbusMart Team - team@nimbusmart.com

## 🙏 Acknowledgments

- AWS Free Tier for making this possible
- Kubernetes community for excellent documentation
- Terraform and Helm teams for great tools
- FastAPI and React communities

## 📞 Support

For support, email team@nimbusmart.com or create an issue in the GitHub repository.

---

**Built with ❤️ by the NimbusMart Team**