# ---------------------------------------------------------------------------
# EC2 IAM Role
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "ec2_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2_role" {
  name               = "oh-hell-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json

  tags = {
    Project = var.project_name
  }
}

# Allow the EC2 instance to access DynamoDB tables
data "aws_iam_policy_document" "ec2_dynamodb" {
  statement {
    sid    = "DynamoDBAccess"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
    ]
    resources = [
      aws_dynamodb_table.users.arn,
      "${aws_dynamodb_table.users.arn}/index/*",
      aws_dynamodb_table.games.arn,
      "${aws_dynamodb_table.games.arn}/index/*",
    ]
  }
}

resource "aws_iam_role_policy" "ec2_dynamodb" {
  name   = "oh-hell-ec2-dynamodb"
  role   = aws_iam_role.ec2_role.id
  policy = data.aws_iam_policy_document.ec2_dynamodb.json
}

# Allow the EC2 instance to stop itself.
# Note: Using a wildcard resource here to avoid a circular dependency between
# aws_instance.backend and aws_iam_role_policy. Post-deployment this policy
# should be tightened to the specific instance ARN.
data "aws_iam_policy_document" "ec2_self_stop" {
  statement {
    sid     = "SelfStop"
    effect  = "Allow"
    actions = ["ec2:StopInstances"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "ec2:ResourceTag/Project"
      values   = [var.project_name]
    }
  }
}

resource "aws_iam_role_policy" "ec2_self_stop" {
  name   = "oh-hell-ec2-self-stop"
  role   = aws_iam_role.ec2_role.id
  policy = data.aws_iam_policy_document.ec2_self_stop.json
}

# Allow the EC2 instance to describe instances (no resource restriction required
# by IAM for Describe* actions)
data "aws_iam_policy_document" "ec2_describe" {
  statement {
    sid       = "DescribeInstances"
    effect    = "Allow"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "ec2_describe" {
  name   = "oh-hell-ec2-describe"
  role   = aws_iam_role.ec2_role.id
  policy = data.aws_iam_policy_document.ec2_describe.json
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "oh-hell-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# ---------------------------------------------------------------------------
# Lambda IAM Role
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "lambda_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "oh-hell-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json

  tags = {
    Project = var.project_name
  }
}

# Attach the AWS-managed basic execution role for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Allow Lambda to start, stop, and describe EC2 instances
data "aws_iam_policy_document" "lambda_ec2_control" {
  statement {
    sid    = "EC2Control"
    effect = "Allow"
    actions = [
      "ec2:StartInstances",
      "ec2:StopInstances",
      "ec2:DescribeInstances",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "lambda_ec2_control" {
  name   = "oh-hell-lambda-ec2-control"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.lambda_ec2_control.json
}
