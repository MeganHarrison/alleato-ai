# Alleato AI - Business Intelligence Platform

A unified platform combining an AI-powered business assistant with an admin dashboard for comprehensive business management.

## Features

### AI Agent App
- **AI Chat Assistant**: Chat interface for searching documents and meeting transcripts
- **Cloudflare AutoRAG Integration**: Intelligent document search and retrieval
- **Fireflies.ai Integration**: Automated meeting transcription sync
- **Document Management**: Browse and manage your document library

### Admin Dashboard
- **Analytics Dashboard**: Real-time business metrics and charts
- **UI Components**: Comprehensive set of UI elements and forms
- **Tables & Data Management**: Advanced data tables for projects and documents
- **Calendar**: Event management and scheduling
- **User Management**: Profile and access control

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- Cloudflare account (for Workers and R2)
- Fireflies.ai API key (optional, for meeting sync)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-repo/alleato-ai.git
cd alleato-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
FIREFLIES_API_KEY=your_fireflies_key
R2_BUCKET_NAME=your_bucket_name
```

To get these values:
- **CLOUDFLARE_ACCOUNT_ID**: Found in your Cloudflare dashboard URL
- **CLOUDFLARE_API_TOKEN**: Create at Cloudflare Dashboard > My Profile > API Tokens
  - Required permissions: Account:Cloudflare R2:Read
- **R2_BUCKET_NAME**: The name of your R2 bucket containing documents
- **FIREFLIES_API_KEY**: (Optional) From your Fireflies.ai account settings

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
alleato-ai/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard pages
│   ├── chat/              # AI chat interface
│   └── tables/            # Data tables
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── chat/             # Chat interface components
│   └── dashboard/        # Dashboard components
├── src/                   # Dashboard source files
│   ├── components/       # Dashboard-specific components
│   ├── context/          # React contexts
│   └── layout/           # Layout components
├── lib/                   # Utility functions
├── workers/              # Cloudflare Workers
├── scripts/              # Utility scripts
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to Cloudflare Workers

## Technologies Used

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Radix UI
- **Backend**: Cloudflare Workers, R2 Storage
- **AI**: Cloudflare AutoRAG
- **Charts**: Recharts, ApexCharts
- **Icons**: Lucide React, Tabler Icons

## License

This project combines two open-source projects. See LICENSE files for details.