# Unified App Structure

This document describes the consolidated app structure after merging the AI Agent App and Admin Dashboard.

## Directory Structure

```
/app                      # Main Next.js app directory
├── (auth)               # Authentication pages
│   ├── layout.tsx
│   ├── signin/
│   │   └── page.tsx
│   └── signup/
│       └── page.tsx
├── (error-pages)        # Error pages
│   └── error-404/
│       └── page.tsx
├── admin/               # Admin dashboard pages
│   ├── (others-pages)/
│   │   ├── (chart)/
│   │   │   ├── bar-chart/
│   │   │   └── line-chart/
│   │   ├── (forms)/
│   │   │   └── form-elements/
│   │   ├── (tables)/
│   │   │   └── basic-tables/
│   │   ├── blank/
│   │   ├── calendar/
│   │   └── profile/
│   ├── (ui-elements)/
│   │   ├── alerts/
│   │   ├── avatars/
│   │   ├── badge/
│   │   ├── buttons/
│   │   ├── images/
│   │   ├── modals/
│   │   └── videos/
│   ├── layout.tsx       # Admin layout with sidebar
│   └── page.tsx         # Admin homepage
├── api/                 # API routes
│   ├── chat/
│   ├── documents/
│   └── sync-meetings/
├── chat/                # AI chat interface
│   └── page.tsx
├── dashboard/           # Main dashboard
│   └── page.tsx
├── tables/              # Data tables
│   ├── documents/
│   └── projects/
├── globals.css          # Global styles
├── layout.tsx           # Root layout
├── not-found.tsx        # 404 page
└── page.tsx             # Homepage with navigation

/src                     # Dashboard source files
├── components/          # Dashboard-specific components
├── context/             # React contexts (Theme, Sidebar)
├── hooks/               # Custom hooks
├── icons/               # SVG icons
└── layout/              # Layout components

/components              # Shared UI components
├── ui/                  # Radix UI components
├── chat/                # Chat components
└── dashboard/           # Dashboard components
```

## Key Routes

- `/` - Homepage with navigation to all sections
- `/chat` - AI Chat Assistant
- `/admin` - Admin Dashboard
- `/admin/*` - Admin subsections (charts, forms, UI elements)
- `/tables/documents` - Document management
- `/tables/projects` - Project management
- `/dashboard` - Analytics dashboard
- `/signin` - Sign in page
- `/signup` - Sign up page

## Navigation Flow

1. **Homepage (`/`)**: Central hub with cards linking to major sections
2. **AI Chat (`/chat`)**: Full-screen chat interface for AI assistant
3. **Admin Dashboard (`/admin`)**: Traditional admin layout with sidebar navigation
4. **Data Tables**: Standalone pages for document and project management
5. **Authentication**: Full-width auth pages with custom styling

## Styling Strategy

- **Tailwind CSS 4**: Primary styling framework
- **Radix UI**: Component primitives in `/components/ui`
- **Custom utilities**: Dashboard-specific styles in `globals.css`
- **Theme support**: Dark/light mode via ThemeContext

## API Integration

- **Cloudflare R2**: Document storage
- **Fireflies.ai**: Meeting transcription sync
- **AutoRAG**: AI-powered document search

## Environment Variables

Required in `.env.local`:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `R2_BUCKET_NAME`
- `FIREFLIES_API_KEY` (optional)