locals {
  lambda_zip_dir = "${path.module}/.terraform-tmp/lambda"
}

# ---------------------------------------------------------------------------
# start_ec2 Lambda
# ---------------------------------------------------------------------------

data "archive_file" "start_ec2" {
  type        = "zip"
  output_path = "${local.lambda_zip_dir}/start_ec2.zip"
  source {
    content  = <<-PYTHON
import boto3
import json
import os

def handler(event, context):
    ec2 = boto3.client('ec2', region_name=os.environ['AWS_REGION_NAME'])
    instance_id = os.environ['INSTANCE_ID']
    ec2.start_instances(InstanceIds=[instance_id])
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Starting instance', 'instanceId': instance_id})
    }
PYTHON
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "start_ec2" {
  function_name    = "${var.project_name}-start-ec2"
  description      = "Starts the Oh Hell! backend EC2 instance"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.start_ec2.output_path
  source_code_hash = data.archive_file.start_ec2.output_base64sha256
  runtime          = "python3.12"
  handler          = "lambda_function.handler"
  timeout          = 30

  environment {
    variables = {
      INSTANCE_ID      = aws_instance.backend.id
      AWS_REGION_NAME  = var.aws_region
    }
  }

  tags = {
    Project = var.project_name
  }
}

# ---------------------------------------------------------------------------
# stop_ec2 Lambda
# ---------------------------------------------------------------------------

data "archive_file" "stop_ec2" {
  type        = "zip"
  output_path = "${local.lambda_zip_dir}/stop_ec2.zip"
  source {
    content  = <<-PYTHON
import boto3
import json
import os

def handler(event, context):
    ec2 = boto3.client('ec2', region_name=os.environ['AWS_REGION_NAME'])
    instance_id = os.environ['INSTANCE_ID']
    ec2.stop_instances(InstanceIds=[instance_id])
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Stopping instance', 'instanceId': instance_id})
    }
PYTHON
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "stop_ec2" {
  function_name    = "${var.project_name}-stop-ec2"
  description      = "Stops the Oh Hell! backend EC2 instance"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.stop_ec2.output_path
  source_code_hash = data.archive_file.stop_ec2.output_base64sha256
  runtime          = "python3.12"
  handler          = "lambda_function.handler"
  timeout          = 30

  environment {
    variables = {
      INSTANCE_ID      = aws_instance.backend.id
      AWS_REGION_NAME  = var.aws_region
    }
  }

  tags = {
    Project = var.project_name
  }
}

# ---------------------------------------------------------------------------
# ec2_status Lambda
# ---------------------------------------------------------------------------

data "archive_file" "ec2_status" {
  type        = "zip"
  output_path = "${local.lambda_zip_dir}/ec2_status.zip"
  source {
    content  = <<-PYTHON
import boto3
import json
import os

def handler(event, context):
    ec2 = boto3.client('ec2', region_name=os.environ['AWS_REGION_NAME'])
    instance_id = os.environ['INSTANCE_ID']
    response = ec2.describe_instances(InstanceIds=[instance_id])
    reservations = response.get('Reservations', [])
    if not reservations:
        return {
            'statusCode': 404,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Instance not found', 'instanceId': instance_id})
        }
    instance = reservations[0]['Instances'][0]
    state = instance['State']['Name']
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'instanceId': instance_id, 'state': state})
    }
PYTHON
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "ec2_status" {
  function_name    = "${var.project_name}-ec2-status"
  description      = "Returns the current state of the Oh Hell! backend EC2 instance"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.ec2_status.output_path
  source_code_hash = data.archive_file.ec2_status.output_base64sha256
  runtime          = "python3.12"
  handler          = "lambda_function.handler"
  timeout          = 30

  environment {
    variables = {
      INSTANCE_ID      = aws_instance.backend.id
      AWS_REGION_NAME  = var.aws_region
    }
  }

  tags = {
    Project = var.project_name
  }
}
