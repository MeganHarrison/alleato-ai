# Developer Guide - Alleato AI

This guide provides comprehensive instructions for developers working on the Alleato AI platform.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Testing](#testing)
5. [Debugging](#debugging)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

## Environment Setup

### Prerequisites

Ensure you have the following installed:
- Node.js 18.x or higher
- npm 9.x or higher
- Git
- VS Code (recommended) or your preferred editor

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/MeganHarrison/alleato-ai.git
cd alleato-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

4. **Configure Cloudflare CLI**
```bash
npm install -g wrangler
wrangler login
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=           # From Cloudflare dashboard
CLOUDFLARE_API_TOKEN=            # Create at dashboard > API Tokens
ALLEATO_DATABASE_ID=             # D1 database ID after creation

# R2 Storage
R2_BUCKET_NAME=                  # Your R2 bucket name

# External APIs
NOTION_API_KEY=                  # From Notion integrations
NOTION_DATABASE_ID=              # Projects database ID
NOTION_CLIENTS_DATABASE_ID=      # Clients database ID
OPENAI_API_KEY=                  # From OpenAI dashboard
FIREFLIES_API_KEY=               # From Fireflies settings

# Development
NODE_ENV=development
```

### Database Setup

1. **Create D1 Database**
```bash
wrangler d1 create alleato
```

2. **Update wrangler.toml with the database ID**
```toml
[[d1_databases]]
binding = "DB"
database_name = "alleato"
database_id = "your-database-id-here"
```

3. **Run migrations**
```bash
wrangler d1 execute alleato --local --file=src/schema/schema.sql
```

4. **Seed development data** (optional)
```bash
wrangler d1 execute alleato --local --file=src/schema/seed.sql
```

## Development Workflow

### Starting Development Server

```bash
npm run dev
```

This starts:
- Next.js dev server on http://localhost:3000
- Hot module replacement
- TypeScript watching

### Working with Workers

For local worker development:

```bash
# Terminal 1: Start the Next.js app
npm run dev

# Terminal 2: Start a specific worker
cd workers/d1-notion-sync
npm run dev
```

### Code Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── (auth)/         # Auth group routes
│   └── [feature]/      # Feature pages
├── components/         # Reusable components
│   ├── ui/            # Base UI components
│   └── [feature]/     # Feature components
├── lib/               # Utilities and helpers
├── hooks/             # Custom React hooks
└── types/             # TypeScript definitions
```

### Adding a New Feature

1. **Create feature directory**
```bash
mkdir -p src/app/[feature-name]
mkdir -p components/[feature-name]
```

2. **Create the page component**
```typescript
// src/app/[feature-name]/page.tsx
export default function FeaturePage() {
  return (
    <div>
      <h1>Feature Name</h1>
      {/* Your content */}
    </div>
  );
}
```

3. **Add to navigation** (if needed)
```typescript
// components/layout/AppSidebar.tsx
const navItems = [
  // ... existing items
  { icon: <YourIcon />, name: "Feature Name", path: "/feature-name" },
];
```

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Avoid `any` type - use `unknown` if type is truly unknown

```typescript
// Good
interface Project {
  id: number;
  title: string;
  status: 'active' | 'completed' | 'pending';
}

// Bad
const project: any = { id: 1, title: 'Test' };
```

### React Best Practices

- Use functional components with hooks
- Implement proper error boundaries
- Memoize expensive computations

```typescript
// Good
const ProjectList = memo(({ projects }: { projects: Project[] }) => {
  const sortedProjects = useMemo(
    () => projects.sort((a, b) => a.title.localeCompare(b.title)),
    [projects]
  );
  
  return (
    <div>
      {sortedProjects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
});
```

### API Routes

- Use proper HTTP methods
- Implement error handling
- Validate inputs

```typescript
// src/app/api/projects/route.ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    
    // Validate inputs
    if (page < 1) {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }
    
    // Fetch data
    const projects = await getProjects(page);
    
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Styling Guidelines

- Use Tailwind CSS classes
- Create component-specific styles sparingly
- Follow mobile-first approach

```typescript
// Good
<div className="p-4 md:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
  <h2 className="text-lg md:text-xl font-semibold mb-4">Title</h2>
</div>

// Avoid inline styles
<div style={{ padding: '16px', backgroundColor: 'white' }}>
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- components/ProjectCard.test.tsx
```

### Writing Tests

```typescript
// components/__tests__/ProjectCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';

describe('ProjectCard', () => {
  const mockProject = {
    id: 1,
    title: 'Test Project',
    status: 'active' as const,
  };

  it('renders project title', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('displays correct status', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });
});
```

### E2E Testing

```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e:headed
```

## Debugging

### Client-Side Debugging

1. **Browser DevTools**
   - Use React Developer Tools extension
   - Check Network tab for API calls
   - Use Console for debugging logs

2. **VS Code Debugging**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Server-Side Debugging

```typescript
// Add debug logs
console.log('[API] Processing request:', {
  method: request.method,
  url: request.url,
  headers: Object.fromEntries(request.headers),
});
```

### Worker Debugging

```bash
# Local worker development with logs
wrangler dev --local

# Tail production logs
wrangler tail
```

## Common Tasks

### Adding a New API Endpoint

1. Create route file:
```typescript
// src/app/api/[endpoint]/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Implementation
  return NextResponse.json({ data: 'response' });
}

export async function POST(request: Request) {
  const body = await request.json();
  // Implementation
  return NextResponse.json({ success: true });
}
```

### Working with D1 Database

```typescript
// src/lib/db.ts
export async function getProjects(env: Env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC'
  ).bind('active').all();
  
  return results;
}
```

### Implementing Notion Sync

```typescript
// workers/notion-sync/index.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // Fetch from Notion
    const notionData = await fetchNotionDatabase(env.NOTION_API_KEY);
    
    // Transform and sync to D1
    for (const item of notionData) {
      await env.DB.prepare(
        'INSERT OR REPLACE INTO projects (id, title, notion_id) VALUES (?, ?, ?)'
      ).bind(item.id, item.title, item.notion_id).run();
    }
  },
};
```

## Troubleshooting

### Common Issues

**Issue: "Module not found" error**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

**Issue: Environment variables not loading**
```bash
# Ensure .env.local exists
# Restart dev server after changes
```

**Issue: D1 database connection errors**
```bash
# Check wrangler.toml configuration
# Verify database ID matches
# Try local mode: --local flag
```

**Issue: Notion sync failing**
- Check API key validity
- Verify database IDs
- Check Notion API rate limits
- Review worker logs: `wrangler tail`

### Getting Help

1. Check existing documentation in `/docs`
2. Search closed GitHub issues
3. Ask in team Slack channel
4. Create detailed GitHub issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details

## Best Practices

### Security

- Never commit sensitive data
- Use environment variables for secrets
- Validate all user inputs
- Implement proper authentication checks

### Performance

- Use React.memo for expensive components
- Implement proper caching strategies
- Optimize images with Next.js Image
- Use suspense boundaries for async operations

### Maintenance

- Keep dependencies updated
- Write clear commit messages
- Document complex logic
- Add tests for new features

---

For additional help, refer to the [Architecture Overview](./architecture.md) or contact the development team.