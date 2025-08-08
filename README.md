# Alleato AI - Business Intelligence Platform

A comprehensive business intelligence platform built for Alleato Group, featuring AI-powered chat assistance, project management, client relationship management, and seamless Notion integration.

## 🚀 Overview

Alleato AI is a modern web application that centralizes business operations with:
- **AI Chat Assistant**: Intelligent conversational interface for business queries
- **Project Management**: Track and manage construction/development projects
- **Client Management**: Comprehensive CRM functionality
- **Document Intelligence**: Smart document processing and retrieval
- **Meeting Insights**: Integration with Fireflies.ai for meeting transcriptions
- **Notion Sync**: Bidirectional synchronization with Notion databases

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers, D1 Database (SQLite), R2 Storage
- **AI/ML**: OpenAI API, Vectorize for embeddings
- **Integrations**: Notion API, Fireflies.ai
- **UI Components**: Radix UI, shadcn/ui, Recharts
- **Styling**: Tailwind CSS with custom Nunito Sans font

## 📁 Project Structure

```
alleato-ai/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── (auth)/       # Authentication pages
│   │   ├── admin/        # Admin dashboard
│   │   ├── api/          # API routes
│   │   ├── chat/         # AI chat interface
│   │   ├── dashboard/    # Main dashboard
│   │   ├── meetings/     # Meeting management
│   │   └── tables/       # Data tables (projects, clients, docs)
│   ├── components/       # React components
│   ├── lib/             # Utility functions
│   └── schema/          # Database schemas
├── workers/             # Cloudflare Workers
│   ├── d1-notion-sync/  # D1 to Notion sync
│   ├── fireflies-rag/   # Meeting transcript RAG
│   └── notion-to-d1-sync/ # Notion to D1 sync
├── public/              # Static assets
├── scripts/             # Deployment and utility scripts
└── docs/               # Documentation
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Cloudflare account with Workers and D1 enabled
- Notion workspace and API key
- OpenAI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MeganHarrison/alleato-ai.git
cd alleato-ai
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables:
```env
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Database Configuration  
ALLEATO_DATABASE_ID=your_d1_database_id

# R2 Storage
R2_BUCKET_NAME=your_r2_bucket_name

# External APIs
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_projects_database_id
NOTION_CLIENTS_DATABASE_ID=your_notion_clients_database_id
OPENAI_API_KEY=your_openai_api_key
FIREFLIES_API_KEY=your_fireflies_api_key
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

1. Create D1 database:
```bash
wrangler d1 create alleato
```

2. Run migrations:
```bash
wrangler d1 execute alleato --file=src/schema/schema.sql
```

### Deploy Workers

Deploy sync workers:
```bash
cd workers/d1-notion-sync && npm run deploy
cd ../notion-to-d1-sync && npm run deploy
```

## 🔑 Key Features

### AI Chat Assistant
- Context-aware responses using RAG (Retrieval Augmented Generation)
- Access to project data, client information, and meeting transcripts
- Natural language queries for business insights

### Project Management
- Real-time sync with Notion projects database
- Track project status, revenue, and profitability
- Visual analytics and reporting

### Client Management
- Comprehensive client database with contact information
- Bidirectional Notion synchronization
- Client project history and interactions

### Document Intelligence
- Smart document processing and categorization
- Full-text search across all documents
- Integration with R2 storage for file management

### Meeting Insights
- Automatic meeting transcript processing
- Searchable meeting history
- AI-powered meeting summaries and action items

## 🔄 Notion Integration

The platform features deep Notion integration:

1. **Projects Sync**: Automatically syncs projects between D1 and Notion
2. **Clients Sync**: Keeps client data synchronized across platforms
3. **Scheduled Sync**: Cron jobs run every 4-6 hours for data freshness

To set up Notion sync:
1. Create databases in Notion with required properties
2. Add database IDs to environment variables
3. Deploy sync workers
4. Use sync buttons in the UI for manual synchronization

## 🧪 Testing

Run tests:
```bash
npm test
```

Run linting:
```bash
npm run lint
```

Type checking:
```bash
npm run type-check
```

## 📦 Deployment

### Deploy to Cloudflare Pages

1. Build the application:
```bash
npm run build
```

2. Deploy with Wrangler:
```bash
npx wrangler pages deploy out
```

### Environment Variables

Ensure all environment variables are configured in:
- Cloudflare Pages settings
- Worker configurations (wrangler.toml)
- Local .env files

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages

## 📚 Documentation

- [Architecture Overview](docs/architecture.md)
- [AI Agent Guide](docs/ai-agent.md)
- [Dashboard Components](docs/dashboard.md)
- [App Structure](docs/app-structure.md)
- [Claude Integration](docs/claude-integration.md)

## 🐛 Known Issues

- Notion sync may experience rate limiting with large datasets
- Meeting transcripts should be removed from version control
- Some UI components need accessibility improvements