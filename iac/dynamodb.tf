resource "aws_dynamodb_table" "users" {
  name         = "oh-hell-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "username"
    type = "S"
  }

  global_secondary_index {
    name            = "username-index"
    hash_key        = "username"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Project     = var.project_name
    Environment = "production"
  }
}

resource "aws_dynamodb_table" "games" {
  name         = "oh-hell-games"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "gameId"
  range_key    = "completedAt"

  attribute {
    name = "gameId"
    type = "S"
  }

  attribute {
    name = "completedAt"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Project     = var.project_name
    Environment = "production"
  }
}
