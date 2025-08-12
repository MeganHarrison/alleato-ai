# Security Configuration

## Overview
This document explains how to securely configure API keys and secrets for the Alleato AI application.

## ⚠️ IMPORTANT SECURITY NOTICE
**NEVER commit API keys or secrets to version control!** All sensitive configuration should be stored in environment variables or Cloudflare secrets.

## Setup Instructions

### 1. Local Development

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your actual API keys and secrets

3. The `.env.local` file is automatically ignored by git and will never be committed

### 2. Production Deployment (Cloudflare Workers)

For production, use Cloudflare's secret management:

1. Set secrets using the Wrangler CLI:
   ```bash
   # Set individual secrets
   npx wrangler secret put OPENAI_API_KEY
   npx wrangler secret put FIREFLIES_API_KEY
   npx wrangler secret put NOTION_API_KEY
   npx wrangler secret put CLOUDFLARE_API_TOKEN
   ```

2. Or use the provided script (after setting up .env.local):
   ```bash
   ./scripts/set-cloudflare-secrets.sh
   ```

### 3. Required Secrets

| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `OPENAI_API_KEY` | OpenAI API key for embeddings and AI features | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `FIREFLIES_API_KEY` | Fireflies.ai API key for meeting transcriptions | [Fireflies Settings](https://app.fireflies.ai/settings/api) |
| `NOTION_API_KEY` | Notion integration token | [Notion Integrations](https://www.notion.so/my-integrations) |
| `NOTION_DATABASE_ID` | Notion database ID for projects | Your Notion database URL |
| `NOTION_CLIENTS_DATABASE_ID` | Notion database ID for clients | Your Notion database URL |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Cloudflare dashboard |

### 4. Verifying Secrets

To verify secrets are properly set in Cloudflare:

```bash
npx wrangler secret list
```

### 5. Security Best Practices

1. **Rotate Keys Regularly**: Change API keys every 90 days
2. **Use Least Privilege**: Create API keys with minimal required permissions
3. **Monitor Usage**: Regularly check API usage for anomalies
4. **Separate Environments**: Use different keys for development and production
5. **Audit Access**: Keep track of who has access to secrets

### 6. If Keys Are Exposed

If you accidentally commit secrets:

1. **Immediately revoke** the exposed keys in their respective platforms
2. Generate new keys
3. Update all environments with new keys
4. Use `git filter-branch` or BFG Repo-Cleaner to remove secrets from git history
5. Force push the cleaned history (coordinate with team)

### 7. Files That Should Never Be Committed

- `.env.local`
- `.env`
- `.env.production`
- `secrets.json`
- `*.key`
- `*.pem`
- `*.cert`
- Any file containing API keys or passwords

## Contact

If you have questions about security configuration, please contact the project maintainers.