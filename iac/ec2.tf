resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg"
  description = "Oh Hell! backend security group"

  ingress {
    description = "Game server from CloudFront IPs (managed prefix list)"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    # Use CloudFront managed prefix list for production; for simplicity allow 0.0.0.0/0 here
    # Production note: use aws_ec2_managed_prefix_list data source for CloudFront IPs
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH from admin"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-backend-sg"
    Project = var.project_name
  }
}

resource "aws_instance" "backend" {
  ami                    = var.ec2_ami
  instance_type          = var.ec2_instance_type
  key_name               = var.ec2_key_pair_name
  vpc_security_group_ids = [aws_security_group.backend.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  user_data = base64encode(templatefile("${path.module}/scripts/ec2-userdata.sh", {
    jwt_secret  = var.jwt_secret
    aws_region  = var.aws_region
    instance_id = "SELF" # Will be overwritten by userdata script
  }))

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name    = "${var.project_name}-backend"
    Project = var.project_name
  }

  lifecycle {
    ignore_changes = [user_data]
  }
}

resource "aws_eip" "backend" {
  instance = aws_instance.backend.id
  domain   = "vpc"

  tags = {
    Name    = "${var.project_name}-backend-eip"
    Project = var.project_name
  }
}
