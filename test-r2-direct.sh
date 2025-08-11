#!/bin/bash

# Load environment variables
source .env.local

# Test R2 bucket list directly
echo "Testing R2 API directly..."
echo "Account ID: $CLOUDFLARE_ACCOUNT_ID"
echo "Bucket: $R2_BUCKET_NAME"
echo ""

# List buckets first
echo "=== Listing R2 Buckets ==="
curl -X GET "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "=== Checking specific bucket ==="
curl -X GET "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/$R2_BUCKET_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "=== Listing objects in bucket ==="
curl -X GET "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/$R2_BUCKET_NAME/objects?per_page=10" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" | jq '.'