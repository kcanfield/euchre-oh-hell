output "ec2_elastic_ip" {
  description = "Elastic IP address of the backend EC2 instance"
  value       = aws_eip.backend.public_ip
}

output "cloudfront_url" {
  description = "CloudFront distribution domain name (HTTPS)"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "api_gateway_url" {
  description = "API Gateway v2 invoke URL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "dynamodb_users_table" {
  description = "DynamoDB users table name"
  value       = aws_dynamodb_table.users.name
}

output "dynamodb_games_table" {
  description = "DynamoDB games table name"
  value       = aws_dynamodb_table.games.name
}

output "ec2_instance_id" {
  description = "EC2 backend instance ID"
  value       = aws_instance.backend.id
}
