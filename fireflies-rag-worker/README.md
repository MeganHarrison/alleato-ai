# Fireflies RAG Worker

A Cloudflare Worker that integrates with Fireflies.ai to automatically download, store, and vectorize meeting transcripts for AI-powered search and retrieval.

## 🚀 Features

- **Automatic Sync**: Pulls meeting transcripts from Fireflies API
- **Real-time Updates**: Webhook support for instant transcript processing
- **Smart Chunking**: Multiple chunking strategies for optimal retrieval
- **Vector Search**: AI-powered semantic search using OpenAI embeddings
- **Full-text Search**: Traditional keyword search capabilities
- **Dashboard**: Web UI for monitoring and management
- **Categorization**: Automatic meeting categorization and tagging

## 📋 Prerequisites

- Cloudflare account with Workers enabled
- Fireflies.ai API key
- OpenAI API key
- Cloudflare D1 database
- Cloudflare R2 bucket

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/fireflies-rag-worker.git
cd fireflies-rag-worker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create D1 Database

```bash
# Create the database
wrangler d1 create alleato-meetings

# Apply the schema
wrangler d1 execute alleato-meetings --file=./schema.sql
```

### 4. Create R2 Bucket

```bash
wrangler r2 bucket create meeting-transcripts
```

### 5. Configure wrangler.toml

```bash
cp wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml` and update:
- `database_id` with your D1 database ID
- Adjust cron schedules if needed

### 6. Set Environment Variables

In Cloudflare dashboard, set these secrets:

```bash
wrangler secret put FIREFLIES_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put FIREFLIES_WEBHOOK_SECRET  # Optional
```

### 7. Deploy

```bash
wrangler deploy
```

### 8. Test the Deployment

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run comprehensive tests
./scripts/test-pipeline.sh https://your-worker.workers.dev
```

See [TESTING.md](TESTING.md) for detailed testing instructions.

## 🔧 Configuration

### Fireflies Webhook Setup

1. Go to your Fireflies settings
2. Add webhook URL: `https://your-worker.workers.dev/webhook`
3. Select events: `transcription.completed`
4. Save the webhook secret if using signature verification

### Chunking Strategy

The system uses three chunking strategies:

1. **Full Transcript**: Complete meeting context
2. **Time Segments**: 5-minute chunks with overlap
3. **Speaker Turns**: Natural conversation breaks

Adjust in `src/chunkingStrategy.js` if needed.

## 📡 API Endpoints

### Core Endpoints

- `GET /` - Dashboard UI
- `POST /webhook` - Fireflies webhook receiver
- `POST /sync` - Manual sync trigger
- `POST /process` - Start vectorization queue

### Search Endpoints

- `POST /search` - Text-based search
- `POST /vector-search` - AI semantic search
- `GET /meetings` - List all meetings
- `GET /filter-options` - Get available filters

### Admin Endpoints

- `GET /test` - System health check
- `GET /debug` - Debug information
- `GET /analytics` - Usage statistics

### Testing Endpoints

- `GET /test-pipeline` - Run comprehensive pipeline tests
- `GET /test-single-transcript` - Test single transcript processing
- `GET /validate-transcript?id=XXX` - Validate specific transcript

## 🔍 Usage Examples

### Manual Sync

```bash
curl -X POST https://your-worker.workers.dev/sync
```

### Search Meetings

```bash
curl -X POST https://your-worker.workers.dev/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "discussion about product roadmap",
    "limit": 10,
    "filters": {
      "category": "planning",
      "dateFrom": "2024-01-01"
    }
  }'
```

### List Recent Meetings

```bash
curl https://your-worker.workers.dev/meetings?limit=20&offset=0
```

## 🏗️ Architecture

### Storage

- **D1 Database**: Meeting metadata, chunks, vectors
- **R2 Bucket**: Full transcript markdown files

### Processing Pipeline

1. Fireflies webhook/sync triggers download
2. Transcript stored in R2 and metadata in D1
3. Chunking strategy applied
4. OpenAI embeddings generated
5. Vectors stored for similarity search

### Search Flow

1. Query embedding generated
2. Cosine similarity calculated
3. Results ranked and filtered
4. Context enriched for display

## 🎯 Best Practices

### Performance

- Batch processing for embeddings
- Rate limiting on API calls
- Efficient vector storage as binary blobs
- Indexed database queries

### Security

- API keys stored as secrets
- Webhook signature verification
- CORS headers configured
- Input validation on all endpoints

## 🐛 Troubleshooting

### Common Issues

1. **Database not connected**
   - Check D1 binding in wrangler.toml
   - Verify database ID is correct

2. **Sync not working**
   - Check Fireflies API key
   - Verify cron triggers in wrangler.toml

3. **Vectorization failing**
   - Check OpenAI API key
   - Monitor rate limits

### Debug Mode

Visit `/debug` endpoint for system diagnostics.

## 📈 Monitoring

- Check `/analytics` for usage stats
- Monitor Cloudflare Workers analytics
- Set up alerts for failed webhooks

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📚 Additional Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Step-by-step deployment guide
- [TESTING.md](TESTING.md) - Comprehensive testing instructions
- [test/integration.test.js](test/integration.test.js) - Integration test suite

## 🧪 Testing

The project includes comprehensive testing tools:

1. **Pipeline Test**: `/test-pipeline` - Tests all components
2. **Single Transcript Test**: `/test-single-transcript` - Tests one transcript end-to-end
3. **Validation**: `/validate-transcript?id=XXX` - Validates specific transcript
4. **Test Scripts**: `scripts/test-pipeline.sh` - Automated testing

Run tests after deployment:
```bash
./scripts/test-pipeline.sh https://your-worker.workers.dev
```

## 📄 License

MIT License - see LICENSE file for details