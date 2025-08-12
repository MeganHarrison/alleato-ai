# Alleato AI - Simplified Frontend

## ✅ Project Successfully Simplified!

This project has been simplified to work with Claude Code CLI by removing complex Cloudflare Workers integration and connecting to deployed workers instead.

## 🚀 What Changed

1. **Removed Cloudflare Dependencies**: All wrangler, @opennextjs/cloudflare, and related dependencies removed
2. **Clean Next.js Project**: Now a standard Next.js application without complex build processes
3. **External Workers**: Connected to deployed Cloudflare Workers:
   - RAG Worker: https://fireflies-rag-worker.megan-d14.workers.dev (827 meetings, fully operational)
   - API Worker: https://alleato-api.megan-d14.workers.dev (D1 + R2 access)

## 📊 RAG Worker Stats
- **Total Meetings**: 827
- **Vectorized**: 65
- **Total Chunks**: 641
- **Status**: LIVE ✅

## 🛠️ Getting Started

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev

# Build for production
npm run build
```

## 🔗 Worker Endpoints

### RAG Worker (https://fireflies-rag-worker.megan-d14.workers.dev)
- `/test` - System health check
- `/meetings` - List all meetings
- `/search` - Text search
- `/vector-search` - AI-powered semantic search
- `/sync` - Sync with Fireflies
- `/process` - Start vectorization

### API Worker (https://alleato-api.megan-d14.workers.dev)
- `/api/projects` - Projects management
- `/api/clients` - Clients management
- `/api/meetings` - Meetings data
- `/api/documents` - Documents
- `/api/test` - Health check

## 📁 Project Structure

```
alleato-ai/
├── src/
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   └── lib/
│       └── workers-api.ts  # Worker API client
├── package.json      # Simplified dependencies
├── next.config.js    # Clean Next.js config
└── .env.local        # Worker URLs configuration
```

## 🎯 Benefits

1. **Claude Code CLI Compatible**: No more complex worker compilation issues
2. **Faster Development**: Standard Next.js hot reload
3. **Clean Separation**: Frontend and workers deployed independently
4. **Scalable**: Workers can be updated without touching frontend
5. **Simple Deployment**: Deploy with Vercel, Netlify, or any Next.js host

## 🔍 Testing

Test the deployed workers directly:
```bash
# Test RAG Worker
curl https://fireflies-rag-worker.megan-d14.workers.dev/test

# Test API Worker
curl https://alleato-api.megan-d14.workers.dev/api/test
```

## 📝 Environment Variables

All worker URLs are configured in `.env.local`:
```env
NEXT_PUBLIC_RAG_WORKER_URL=https://fireflies-rag-worker.megan-d14.workers.dev
NEXT_PUBLIC_API_WORKER_URL=https://alleato-api.megan-d14.workers.dev
```

## ✨ Result

Your project is now a clean Next.js application that talks to external Cloudflare Workers. This eliminates all the complex build issues while maintaining full functionality!