output "backend_sa_role_arn" {
  description = "ARN of the backend service account IAM role"
  value       = aws_iam_role.backend_sa.arn
}

output "alb_controller_role_arn" {
  description = "ARN of the ALB controller IAM role"
  value       = aws_iam_role.alb_controller.arn
}

output "fluent_bit_role_arn" {
  description = "ARN of the Fluent Bit IAM role"
  value       = aws_iam_role.fluent_bit.arn
}

output "backend_sa_role_name" {
  description = "Name of the backend service account IAM role"
  value       = aws_iam_role.backend_sa.name
}

output "alb_controller_role_name" {
  description = "Name of the ALB controller IAM role"
  value       = aws_iam_role.alb_controller.name
}

output "fluent_bit_role_name" {
  description = "Name of the Fluent Bit IAM role"
  value       = aws_iam_role.fluent_bit.name
}