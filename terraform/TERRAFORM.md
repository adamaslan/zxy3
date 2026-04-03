# Terraform Infrastructure — ZXY Gallery

This directory provisions the AWS infrastructure for the ZXY Gallery artist enrichment pipeline using Terraform.

---

## What It Provisions

### AWS Lambda: `enrichArtist`

A Node.js 20 Lambda function that enriches artist records using external AI APIs. It:
- Reads from and writes to CockroachDB
- Calls the **Gemini API** for artist data enrichment
- Calls the **Google Cloud Vision API** for image analysis
- Has a 30-second timeout and 256 MB memory allocation

The deployment package is a pre-built zip at `../lambda/enrichArtist-full.zip`. Rebuild it with:
```bash
make bundle
```

### IAM Role: `zxy-lambda-execution`

A minimal execution role for the Lambda function with only the `AWSLambdaBasicExecutionRole` policy attached (grants permission to write logs to CloudWatch).

### CloudWatch Log Group: `/aws/lambda/enrichArtist`

Captures Lambda logs with a 14-day retention period.

---

## Files

| File | Purpose |
|------|---------|
| [main.tf](main.tf) | All resource definitions (Lambda, IAM, CloudWatch, variables, outputs) |
| [terraform.tfvars.example](terraform.tfvars.example) | Template for secrets — copy to `terraform.tfvars` and fill in |
| [.terraform.lock.hcl](.terraform.lock.hcl) | Provider version lock (AWS provider `5.100.0`) — committed to source control |

---

## State

State is stored **locally** (`terraform.tfstate`) — appropriate for a single-developer project. A commented-out S3 backend block in `main.tf` is available if you need to migrate to remote state:

```hcl
backend "s3" {
  bucket = "zxy-terraform-state"
  key    = "lambda/terraform.tfstate"
  region = "us-east-1"
}
```

---

## Configuration

Copy the example vars file and fill in real values:
```bash
cp terraform.tfvars.example terraform.tfvars
```

| Variable | Description |
|----------|-------------|
| `aws_region` | AWS region (default: `us-east-1`) |
| `gemini_api_key` | Gemini API key for artist enrichment |
| `google_vision_api_key` | Google Cloud Vision API key |
| `database_url` | CockroachDB connection string (`postgresql://...`) |

`terraform.tfvars` is gitignored — never commit it.

---

## Usage

```bash
# First-time setup
terraform init

# Preview changes
terraform plan

# Apply changes
terraform apply

# Destroy all resources
terraform destroy
```

---

## Outputs

After `apply`, Terraform outputs:

| Output | Value |
|--------|-------|
| `lambda_arn` | Full ARN of the `enrichArtist` Lambda function |
| `lambda_role_arn` | ARN of the Lambda execution IAM role |
