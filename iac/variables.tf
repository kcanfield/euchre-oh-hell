variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Project name used as a prefix for resource naming"
  type        = string
  default     = "oh-hell"
}

variable "admin_cidr" {
  description = "Your IP in CIDR for SSH and admin access, e.g. 1.2.3.4/32"
  type        = string
  sensitive   = true
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the backend server"
  type        = string
  default     = "t3.micro"
}

variable "ec2_ami" {
  description = "Amazon Linux 2023 AMI ID for us-east-2"
  type        = string
}

variable "ec2_key_pair_name" {
  description = "EC2 key pair name for SSH access"
  type        = string
}

variable "jwt_secret" {
  description = "JWT secret for the Node.js server, min 32 chars"
  type        = string
  sensitive   = true
}

variable "cloudfront_price_class" {
  description = "CloudFront price class controlling which edge locations are used"
  type        = string
  default     = "PriceClass_100"
}
