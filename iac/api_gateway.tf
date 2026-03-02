resource "aws_apigatewayv2_api" "server_control" {
  name          = "${var.project_name}-server-control"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.server_control.id
  name        = "$default"
  auto_deploy = true
}

# ---------------------------------------------------------------------------
# Lambda integrations
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_integration" "ec2_status" {
  api_id                 = aws_apigatewayv2_api.server_control.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.ec2_status.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "start_ec2" {
  api_id                 = aws_apigatewayv2_api.server_control.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.start_ec2.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "stop_ec2" {
  api_id                 = aws_apigatewayv2_api.server_control.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.stop_ec2.invoke_arn
  payload_format_version = "2.0"
}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_route" "get_status" {
  api_id    = aws_apigatewayv2_api.server_control.id
  route_key = "GET /status"
  target    = "integrations/${aws_apigatewayv2_integration.ec2_status.id}"
}

resource "aws_apigatewayv2_route" "post_start" {
  api_id    = aws_apigatewayv2_api.server_control.id
  route_key = "POST /start"
  target    = "integrations/${aws_apigatewayv2_integration.start_ec2.id}"
}

resource "aws_apigatewayv2_route" "post_stop" {
  api_id    = aws_apigatewayv2_api.server_control.id
  route_key = "POST /stop"
  target    = "integrations/${aws_apigatewayv2_integration.stop_ec2.id}"
}

# ---------------------------------------------------------------------------
# Lambda permissions — allow API Gateway to invoke each function
# ---------------------------------------------------------------------------

resource "aws_lambda_permission" "apigw_ec2_status" {
  statement_id  = "AllowAPIGatewayInvokeStatus"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ec2_status.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.server_control.execution_arn}/*/*/status"
}

resource "aws_lambda_permission" "apigw_start_ec2" {
  statement_id  = "AllowAPIGatewayInvokeStart"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.start_ec2.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.server_control.execution_arn}/*/*/start"
}

resource "aws_lambda_permission" "apigw_stop_ec2" {
  statement_id  = "AllowAPIGatewayInvokeStop"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stop_ec2.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.server_control.execution_arn}/*/*/stop"
}
