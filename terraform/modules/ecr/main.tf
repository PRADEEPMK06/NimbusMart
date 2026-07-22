# terraform/modules/ecr/main.tf
# ECR repositories module for the deployment platform

locals {
  name = var.name_prefix
  tags = merge(var.tags, {
    Name        = local.name
    Environment = var.environment
    ManagedBy   = "Terraform"
  })
}

# ── ECR Repositories ──────────────────────────────────────────────────────────

resource "aws_ecr_repository" "repositories" {
  for_each = toset(var.repository_names)

  name                 = "${local.name}-${each.value}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.tags, {
    Name = "${local.name}-${each.value}"
  })
}

# ── Lifecycle Policy ──────────────────────────────────────────────────────────

resource "aws_ecr_lifecycle_policy" "repositories" {
  for_each = aws_ecr_repository.repositories

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "prod", "main"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images older than 7 days"
        selection {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Remove all images older than 30 days"
        selection {
          tagStatus   = "any"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 30
        }
        action {
          type = "expire"
        }
      }
    ]
  })
}