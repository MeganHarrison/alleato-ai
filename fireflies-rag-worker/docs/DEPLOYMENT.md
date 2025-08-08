# Fireflies RAG Worker - Deployment Guide

This guide walks you through deploying and testing the Fireflies RAG Worker from scratch.

## Prerequisites

- Node.js 16+ installed
- Cloudflare account
- Fireflies.ai account with API access
- OpenAI API account

## Step 1: Initial Setup

### 1.1 Clone and Install

```bash
git clone https://github.com/yourusername/fireflies-rag-worker.git
cd fireflies-rag-worker
npm install
```

### 1.2 Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

## Step 2: Create Cloudflare Resources

### 2.1 Create D1 Database

```bash
# Create the database
wrangler d1 create alleato-meetings

# Note the database_id from the output
# Example: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 2.2 Initialize Database Schema

```bash
# Replace YOUR_DATABASE_ID with the actual ID from step 2.1
wrangler d1 execute alleato-meetings --file=./schema.sql --local=false
```

### 2.3 Create R2 Bucket

```bash
wrangler r2 bucket create meeting-transcripts
```

## Step 3: Configure the Worker

### 3.1 Create wrangler.toml

```bash
cp wrangler.toml.example wrangler.toml
```

### 3.2 Edit wrangler.toml

Replace `your-database-id-here` with your actual database ID:

```toml
[[d1_databases]]
binding = "ALLEATO_DB"
database_name = "alleato-meetings"
database_id = "YOUR_DATABASE_ID_HERE"  # <-- Update this
```

## Step 4: Set API Keys

### 4.1 Get Your API Keys

1. **Fireflies API Key**:
   - Go to https://app.fireflies.ai/settings/developer
   - Generate an API key

2. **OpenAI API Key**:
   - Go to https://platform.openai.com/api-keys
   - Create a new secret key

### 4.2 Set Secrets in Cloudflare

```bash
# Set Fireflies API key
wrangler secret put FIREFLIES_API_KEY
# Paste your Fireflies API key when prompted

# Set OpenAI API key
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key when prompted
```

## Step 5: Deploy the Worker

```bash
wrangler deploy
```

Note the deployment URL (e.g., `https://fireflies-rag-worker.username.workers.dev`)

## Step 6: Verify Deployment

### 6.1 Basic Health Check

```bash
# Replace with your actual worker URL
curl https://your-worker.workers.dev/test
```

Expected response:
```json
{
  "message": "🔥 Fireflies RAG Worker is ACTUALLY operational!",
  "status": "WORKING"
}
```

### 6.2 Check Configuration

```bash
curl https://your-worker.workers.dev/debug
```

Verify all services are connected:
- `database_connected`: true
- `r2_connected`: true
- `fireflies_key_set`: true
- `openai_key_set`: true

### 6.3 Run Pipeline Tests

```bash
# Make test script executable
chmod +x scripts/test-pipeline.sh

# Run comprehensive tests
./scripts/test-pipeline.sh https://your-worker.workers.dev
```

## Step 7: Initial Data Sync

### 7.1 Test Single Transcript

First, test with a single transcript to ensure everything works:

```bash
curl https://your-worker.workers.dev/test-single-transcript
```

This will:
1. Fetch one transcript from Fireflies
2. Download and store it
3. Create chunks
4. Add to vectorization queue

### 7.2 Validate the Transcript

Get the transcript ID from the previous response and validate:

```bash
curl "https://your-worker.workers.dev/validate-transcript?id=TRANSCRIPT_ID"
```

### 7.3 Process Vectorization

```bash
curl -X POST https://your-worker.workers.dev/process
```

### 7.4 Run Full Sync

Once single transcript works, run full sync:

```bash
curl -X POST https://your-worker.workers.dev/sync
```

## Step 8: Monitor Progress

### 8.1 View Dashboard

Open in browser: `https://your-worker.workers.dev/`

### 8.2 Check Analytics

```bash
curl https://your-worker.workers.dev/analytics
```

### 8.3 View Logs

```bash
wrangler tail
```

## Step 9: Setup Webhook (Optional)

### 9.1 Configure in Fireflies

1. Go to Fireflies Settings > Webhooks
2. Add webhook URL: `https://your-worker.workers.dev/webhook`
3. Select events: `transcription.completed`
4. Save

### 9.2 Test Webhook

Create a test meeting in Fireflies and verify it's processed automatically.

## Troubleshooting

### Issue: Database not connected

```bash
# Check D1 binding
wrangler d1 list

# Re-run schema if needed
wrangler d1 execute alleato-meetings --file=./schema.sql --local=false
```

### Issue: API Key errors

```bash
# List secrets (doesn't show values)
wrangler secret list

# Re-set a secret
wrangler secret put FIREFLIES_API_KEY
```

### Issue: No transcripts found

- Ensure you have meetings in your Fireflies account
- Check API key has correct permissions
- Try accessing Fireflies API directly:

```bash
curl -H "Authorization: Bearer YOUR_FIREFLIES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { user { email } }"}' \
  https://api.fireflies.ai/graphql
```

### Issue: Vectorization failing

- Check OpenAI API key and credits
- Verify rate limits aren't exceeded
- Check error logs: `wrangler tail`

## Production Checklist

- [ ] All tests passing
- [ ] Webhook configured
- [ ] Cron schedule active
- [ ] Monitoring setup
- [ ] Error alerting configured
- [ ] Backup strategy defined

## Next Steps

1. **Regular Monitoring**: Check dashboard daily initially
2. **Optimize Chunking**: Adjust chunk sizes based on your meeting types
3. **Enhance Search**: Add custom filters for your use case
4. **Scale Up**: Increase sync limits gradually
5. **Add Analytics**: Track search usage and patterns

## Support

- Check logs: `wrangler tail`
- Debug endpoint: `/debug`
- Test pipeline: `/test-pipeline`
- GitHub Issues: [your-repo/issues]