# Testing Guide - Fireflies RAG Worker

This guide explains how to test the complete pipeline to ensure transcripts are properly imported from Fireflies, stored in Cloudflare, and vectorized.

## Quick Start Testing

After deployment, run these commands in order:

```bash
# 1. Make scripts executable
chmod +x scripts/*.sh

# 2. Verify deployment configuration
./scripts/verify-deployment.sh

# 3. Run comprehensive pipeline tests
./scripts/test-pipeline.sh https://your-worker.workers.dev
```

## Testing Endpoints

### 1. `/test-pipeline` - Comprehensive System Test

Tests all components of the pipeline:
- Fireflies API connection
- D1 database connection
- R2 bucket connection
- Transcript download
- Storage operations
- Chunking process
- Vectorization
- Search functionality

```bash
curl https://your-worker.workers.dev/test-pipeline
```

### 2. `/test-single-transcript` - End-to-End Test

Downloads and processes one real transcript:

```bash
curl https://your-worker.workers.dev/test-single-transcript
```

Response includes:
- Transcript ID
- Download result
- Validation status

### 3. `/validate-transcript?id=XXX` - Validate Specific Transcript

Checks if a transcript is properly stored and processed:

```bash
curl "https://your-worker.workers.dev/validate-transcript?id=TRANSCRIPT_ID"
```

Returns validation for:
- Database storage
- R2 storage
- Chunk creation
- Vector generation
- Search indexing

## Manual Testing Steps

### Step 1: Test Fireflies Connection

```bash
curl https://your-worker.workers.dev/debug
```

Verify:
- `fireflies_key_set: true`
- `openai_key_set: true`
- `database_connected: true`
- `r2_connected: true`

### Step 2: Process One Transcript

```bash
# Download and process a single transcript
curl https://your-worker.workers.dev/test-single-transcript

# Note the transcriptId from response
# Example: "transcriptId": "abc123"
```

### Step 3: Validate Processing

```bash
# Replace abc123 with actual transcript ID
curl "https://your-worker.workers.dev/validate-transcript?id=abc123"
```

Expected validation results:
```json
{
  "steps": {
    "inDatabase": true,
    "inR2": true,
    "hasChunks": true,
    "hasVectors": true,
    "isSearchable": true
  },
  "success": true
}
```

### Step 4: Run Vectorization

```bash
curl -X POST https://your-worker.workers.dev/process
```

### Step 5: Test Search

```bash
# Text search
curl -X POST https://your-worker.workers.dev/search \
  -H "Content-Type: application/json" \
  -d '{"query": "meeting", "limit": 5}'

# Vector search (after vectorization)
curl -X POST https://your-worker.workers.dev/vector-search \
  -H "Content-Type: application/json" \
  -d '{"query": "project discussion", "limit": 5}'
```

## Full Pipeline Test

To test the complete flow:

```bash
# 1. Sync transcripts
curl -X POST https://your-worker.workers.dev/sync

# 2. Check status
curl https://your-worker.workers.dev/analytics

# 3. Process vectors
curl -X POST https://your-worker.workers.dev/process

# 4. Verify in dashboard
open https://your-worker.workers.dev/
```

## Monitoring Test Results

### Via Dashboard

Visit `https://your-worker.workers.dev/` to see:
- Total meetings
- Vectorized count
- Recent meetings table
- Processing status

### Via Analytics API

```bash
curl https://your-worker.workers.dev/analytics | jq .
```

Shows:
- Total meetings
- Downloaded transcripts
- Vectorized meetings
- Pending tasks
- Recent errors

### Via Logs

```bash
# Real-time logs
wrangler tail

# Or filter for errors
wrangler tail --format pretty | grep ERROR
```

## Troubleshooting Failed Tests

### Test: Fireflies Connection Failed

```bash
# Test API key directly
curl -H "Authorization: Bearer YOUR_FIREFLIES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { user { email } }"}' \
  https://api.fireflies.ai/graphql
```

### Test: Database Connection Failed

```bash
# Check D1 database
wrangler d1 list

# Re-apply schema if needed
wrangler d1 execute alleato-meetings --file=./schema.sql
```

### Test: Vectorization Failed

```bash
# Check OpenAI API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY"

# Check specific meeting chunks
wrangler d1 execute alleato-meetings \
  --command="SELECT * FROM meeting_chunks WHERE meeting_id='XXX'"
```

## Integration Test Suite

Run the full integration test suite:

```javascript
// In your worker environment
import { runIntegrationTests } from './test/integration.test.js';

const results = await runIntegrationTests(env);
console.log(results);
```

## Expected Test Timeline

1. **Initial deployment**: 2-5 minutes
2. **Single transcript test**: 10-30 seconds
3. **Vectorization**: 5-20 seconds per meeting
4. **Full sync (50 meetings)**: 5-10 minutes
5. **Search indexing**: Near instant

## Success Criteria

Your pipeline is working correctly when:

1. ✅ All tests in `/test-pipeline` pass
2. ✅ Single transcript validation shows all steps complete
3. ✅ Search returns relevant results
4. ✅ Dashboard shows vectorized meetings
5. ✅ No errors in logs

## Continuous Testing

Set up monitoring:

```bash
# Add to your CI/CD
./scripts/test-pipeline.sh $WORKER_URL

# Or schedule regular checks
*/30 * * * * curl https://your-worker.workers.dev/test > /tmp/test.log
```