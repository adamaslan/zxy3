terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state for now — safe for a single-developer project.
  # To use S3 backend later, uncomment and fill in:
  # backend "s3" {
  #   bucket = "zxy-terraform-state"
  #   key    = "lambda/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

# ─── VARIABLES ────────────────────────────────────────────────────────────────

variable "aws_region" {
  default = "us-east-1"
}

variable "gemini_api_key" {
  description = "Gemini API key for artist enrichment"
  type        = string
  sensitive   = true
}

variable "google_vision_api_key" {
  description = "Google Cloud Vision API key"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "CockroachDB connection string"
  type        = string
  sensitive   = true
}

# ─── IAM ROLE ─────────────────────────────────────────────────────────────────

resource "aws_iam_role" "lambda_execution" {
  name = "zxy-lambda-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ─── LAMBDA FUNCTION ──────────────────────────────────────────────────────────

resource "aws_lambda_function" "enrich_artist" {
  function_name = "enrichArtist"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "enrichArtist.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  # Points to the pre-built zip. Run `make bundle` to rebuild it.
  filename         = "${path.module}/../lambda/enrichArtist-full.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda/enrichArtist-full.zip")

  environment {
    variables = {
      GEMINI_API_KEY        = var.gemini_api_key
      GOOGLE_VISION_API_KEY = var.google_vision_api_key
      DATABASE_URL          = var.database_url
    }
  }
}

# ─── CLOUDWATCH LOG GROUP ─────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "enrich_artist" {
  name              = "/aws/lambda/enrichArtist"
  retention_in_days = 14
}

# ─── OUTPUTS ──────────────────────────────────────────────────────────────────

output "lambda_arn" {
  value = aws_lambda_function.enrich_artist.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_execution.arn
}
