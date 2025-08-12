#!/bin/bash

# Script to set Cloudflare Worker secrets
# Run this script after filling in your .env.local file

echo "Setting Cloudflare Worker secrets..."
echo "Make sure you have filled in your .env.local file with actual values"
echo ""

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "Error: .env.local file not found!"
    echo "Please create .env.local from .env.local.example and fill in your values"
    exit 1
fi

# Set secrets for production
echo "Setting production secrets..."
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
npx wrangler secret put CLOUDFLARE_API_KEY --env production
npx wrangler secret put CLOUDFLARE_API_TOKEN --env production
npx wrangler secret put FIREFLIES_API_KEY --env production
npx wrangler secret put NOTION_API_KEY --env production
npx wrangler secret put OPENAI_API_KEY --env production
npx wrangler secret put NOTION_DATABASE_ID --env production
npx wrangler secret put NOTION_CLIENTS_DATABASE_ID --env production

echo ""
echo "Secrets have been set for production environment"
echo "To set secrets for development, run: npx wrangler secret put SECRET_NAME"
echo ""
echo "Remember to NEVER commit .env.local to version control!"