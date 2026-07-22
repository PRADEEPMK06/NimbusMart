# Implementation Plan: 3-Branch CI/CD Strategy

This plan updates the GitHub Actions CI/CD pipeline to follow a professional, enterprise-grade 3-branch strategy (`development` -> `test` -> `prod`).

---

## Proposed Changes

We will restructure the GitHub Workflows inside `.github/workflows/` to align with the three target branches:

### 1. `development` Branch (Development & Sanity Checks)
* **Workflow Name**: `ci-development.yml` (Runs on `push` or `pull_request` to `development`)
* **Behavior**:
  * Runs linting and format checks.
  * Builds frontend and backend Docker images to ensure compilation success (without pushing to ECR).
  * Performs a dry-run `terraform plan` for both **dev** and **prod** environments to verify infrastructure configuration changes are valid.

### 2. `test` Branch (Deployment & Testing)
* **Workflow Name**: `deploy-test.yml` (Runs on `push` to `test` branch)
* **Behavior**:
  * Deploys infrastructure updates to the AWS Dev environment using `terraform/environments/dev`.
  * Builds and pushes the Docker images to ECR (tagged with the GitHub commit SHA).
  * Upgrades/installs Helm charts (ALB Controller, Autoscaler, Fluent Bit, Prometheus, and the NimbusMart app) in the `dev` cluster.
  * Runs integration/smoke tests against the deployed FastAPI/Nginx services on the EKS Dev cluster to verify success.

### 3. `prod` Branch (Production Deployment)
* **Workflow Name**: `deploy-prod.yml` (Runs on `push` to `prod` branch)
* **Behavior**:
  * Deploys infrastructure updates to the AWS Prod environment using `terraform/environments/prod`.
  * Builds and pushes the Docker images to ECR (tagged with the release tag/SHA).
  * Upgrades/installs Helm charts in the EKS Prod cluster (using `values-prod.yaml`).
  * Assumes the production IAM role `AWS_ROLE_ARN_PROD` for OIDC authentication.

---

## File Changes Detailed

### [DELETE] [.github/workflows/terraform-dev.yml](file:///c:/Users/PradeepMK/Desktop/e-com/.github/workflows/terraform-dev.yml)
We will remove the old dev-only Terraform workflow.

### [DELETE] [.github/workflows/deploy-dev.yml](file:///c:/Users/PradeepMK/Desktop/e-com/.github/workflows/deploy-dev.yml)
We will remove the old dev-only app deployment workflow.

### [NEW] [.github/workflows/ci-development.yml](file:///c:/Users/PradeepMK/Desktop/e-com/.github/workflows/ci-development.yml)
Create a new automated validation workflow for the `development` branch.

### [NEW] [.github/workflows/deploy-test.yml](file:///c:/Users/PradeepMK/Desktop/e-com/.github/workflows/deploy-test.yml)
Create the automated deployment and integration testing workflow for the `test` branch.

### [NEW] [.github/workflows/deploy-prod.yml](file:///c:/Users/PradeepMK/Desktop/e-com/.github/workflows/deploy-prod.yml)
Create the automated deployment workflow for the `prod` branch.

### [MODIFY] [.github/workflows/destroy.yml](file:///c:/Users/PradeepMK/Desktop/e-com/.github/workflows/destroy.yml)
Update the environment teardown workflow to align with the new branch and environment strategy:
* Support destroying the `test` environment (which points to dev infra) or `prod` environment.

### [MODIFY] [NimbusMart_AWS_Deployment_Guide.md](file:///c:/Users/PradeepMK/Desktop/e-com/NimbusMart_AWS_Deployment_Guide.md)
Update the documentation to match the new 3-branch lifecycle.

---

## Verification Plan

### Automated Tests
1. Verify YAML syntax for all workflows using GitHub Actions linter or standard schema checkers.
2. Verify branch targets and path rules in triggers.

### Manual Verification
1. Merge code from `development` -> `test` and verify that the Test workflow runs.
2. Merge code from `test` -> `prod` and verify that the Prod workflow runs.
