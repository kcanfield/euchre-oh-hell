#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Oh Hell! backend — EC2 user data bootstrap script
# Terraform templatefile variables: jwt_secret, aws_region, instance_id
# ---------------------------------------------------------------------------

# Update system packages
yum update -y

# Install Node.js 20 (from NodeSource)
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs git

# Install PM2 globally
npm install -g pm2

# Retrieve the actual instance ID from the IMDSv2 metadata service
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id)

# Create application root directory
mkdir -p /app
cd /app

# Helper script: clone repo and start the server
cat > /app/start.sh << 'STARTSCRIPT'
#!/bin/bash
set -euo pipefail
cd /app/euchre01/server
npm ci
npm run build
pm2 start dist/index.js --name oh-hell-server
pm2 save
STARTSCRIPT

chmod +x /app/start.sh

# Write the environment file.
# jwt_secret and aws_region are injected by Terraform templatefile().
# INSTANCE_ID is resolved at runtime from the IMDS above.
cat > /app/.env << ENVFILE
PORT=3001
JWT_SECRET=${jwt_secret}
AWS_REGION=${aws_region}
EC2_INSTANCE_ID=$INSTANCE_ID
DYNAMODB_TABLE_USERS=oh-hell-users
DYNAMODB_TABLE_GAMES=oh-hell-games
CLIENT_URL=PLACEHOLDER_CLOUDFRONT_URL
ENVFILE

# Configure PM2 to start on system boot (as ec2-user)
pm2 startup systemd -u ec2-user --hp /home/ec2-user
