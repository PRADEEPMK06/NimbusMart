# terraform/modules/iam/main.tf
# IAM and IRSA module for the deployment platform

locals {
  name = var.cluster_name
  tags = merge(var.tags, {
    Name        = local.name
    Environment = var.environment
    ManagedBy   = "Terraform"
  })
}

# ── IAM Role for Backend Service Account (IRSA) ───────────────────────────────

resource "aws_iam_role" "backend_sa" {
  name = "${local.name}-backend-sa-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${var.oidc_provider_url}:sub" = "system:serviceaccount:ecommerce:backend-sa"
          }
        }
      }
    ]
  })

  tags = local.tags
}

# ── Policy for Backend to Access Secrets Manager ──────────────────────────────

resource "aws_iam_policy" "backend_secrets" {
  name        = "${local.name}-backend-secrets-policy"
  description = "Allow backend pods to read database credentials from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Effect   = "Allow"
        Resource = var.db_secret_arn
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "backend_secrets" {
  policy_arn = aws_iam_policy.backend_secrets.arn
  role       = aws_iam_role.backend_sa.name
}

# ── IAM Role for AWS Load Balancer Controller ─────────────────────────────────

resource "aws_iam_role" "alb_controller" {
  name = "${local.name}-alb-controller-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${var.oidc_provider_url}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
          }
        }
      }
    ]
  })

  tags = local.tags
}

# ── Policy for ALB Controller ─────────────────────────────────────────────────

resource "aws_iam_policy" "alb_controller" {
  name        = "${local.name}-alb-controller-policy"
  description = "Allow ALB controller to manage load balancers"

  policy = file("${path.module}/policies/alb-controller-policy.json")

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "alb_controller" {
  policy_arn = aws_iam_policy.alb_controller.arn
  role       = aws_iam_role.alb_controller.name
}

# ── IAM Role for Fluent Bit ───────────────────────────────────────────────────

resource "aws_iam_role" "fluent_bit" {
  name = "${local.name}-fluent-bit-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${var.oidc_provider_url}:sub" = "system:serviceaccount:logging:fluent-bit"
          }
        }
      }
    ]
  })

  tags = local.tags
}

# ── Policy for Fluent Bit to Write to CloudWatch ──────────────────────────────

resource "aws_iam_policy" "fluent_bit" {
  name        = "${local.name}-fluent-bit-policy"
  description = "Allow Fluent Bit to write logs to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "fluent_bit" {
  policy_arn = aws_iam_policy.fluent_bit.arn
  role       = aws_iam_role.fluent_bit.name
}