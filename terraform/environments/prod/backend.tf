terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
  }

  backend "s3" {
  bucket         = "nimbusmart-tfstate-832721536511"
  key            = "ecommerce-platform/prod/terraform.tfstate"
  region         = "us-west-2"
  dynamodb_table = "nimbusmart-tflock"
  encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ecommerce-platform"
      ManagedBy   = "terraform"
      Environment = "prod"
    }
  }
}
