# ZXY Lambda build + deploy shortcuts

.PHONY: bundle tf-init tf-import tf-plan tf-apply

# Rebuild the Lambda zip from source
bundle:
	cp lambda/enrichArtist.js lambda/bundle/enrichArtist.js
	cd lambda/bundle && npm install && npx prisma generate
	cd lambda && zip -r enrichArtist-full.zip bundle/
	@echo "✅ enrichArtist-full.zip rebuilt"

# One-time Terraform setup
tf-init:
	cd terraform && terraform init

# Import existing AWS resources into Terraform state (run once)
tf-import:
	cd terraform && terraform import aws_iam_role.lambda_execution zxy-lambda-execution
	cd terraform && terraform import aws_iam_role_policy_attachment.lambda_logs zxy-lambda-execution/arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
	cd terraform && terraform import aws_lambda_function.enrich_artist enrichArtist
	cd terraform && terraform import aws_cloudwatch_log_group.enrich_artist /aws/lambda/enrichArtist

# Preview changes before applying
tf-plan:
	cd terraform && terraform plan

# Deploy Lambda + IAM changes
tf-apply: bundle
	cd terraform && terraform apply
