# Developer Documentation Instructions

## Overview
This prompt instructs Claude Code to create comprehensive frontend developer documentation pages similar to the existing Database Schema page in this project. The documentation should be accessible through the Developer Docs section of the navigation.

## Instructions for Claude Code

Copy and paste the following instructions when you want Claude Code to create new developer documentation:

---

**Task: Create Frontend Developer Documentation Page**

Please create a new developer documentation page following the pattern established by our existing `/database-schema` page. The page should:

### 1. Page Structure Requirements

Create a new page at `src/app/[doc-topic]/page.tsx` where `[doc-topic]` is one of:
- `api-docs` - API endpoint documentation
- `workers-docs` - Cloudflare Workers documentation  
- `site-map` - Application site map and routes
- `component-docs` - Component library documentation
- `architecture` - System architecture overview

### 2. Page Component Template

Use this structure as a base (following the database-schema pattern):

```tsx
"use client";

import React from 'react';
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
// Import relevant Lucide icons based on content

export default function [ComponentName]Page() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <[Icon] className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">[Page Title]</h1>
            <p className="text-muted-foreground mt-1">[Page Description]</p>
          </div>
        </div>

        {/* Statistics Cards (if applicable) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Add relevant stats cards */}
        </div>

        {/* Main Content Sections */}
        <Card>
          <CardHeader>
            <CardTitle>[Section Title]</CardTitle>
            <CardDescription>[Section Description]</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add tables, lists, or other content */}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
```

### 3. Content Requirements by Documentation Type

#### For API Documentation (`/api-docs`):
- List all API endpoints with their methods (GET, POST, PUT, DELETE)
- Include request/response examples
- Document required headers and authentication
- Show which Cloudflare bindings are used (D1, R2, KV, etc.)
- Group by feature area (Sync, Projects, Meetings, etc.)

#### For Workers Documentation (`/workers-docs`):
- List all Cloudflare Workers in the project
- Show deployment status and configuration
- Document environment variables and bindings
- Include trigger types (HTTP, Cron, Queue)
- Link to relevant source files

#### For Site Map (`/site-map`):
- Visual hierarchy of all application routes
- Distinguish between public and protected routes
- Show route parameters and query strings
- Include API routes alongside page routes
- Mark dynamic vs static routes

#### For Component Documentation (`/component-docs`):
- Catalog of reusable UI components
- Props documentation for each component
- Usage examples with code snippets
- Component dependencies and imports
- Styling and theming information

#### For Architecture Overview (`/architecture`):
- System architecture diagram (using ASCII art or descriptions)
- Data flow between services
- Technology stack overview
- Deployment architecture
- Security and authentication flow

### 4. Navigation Integration

Add the new documentation page to the navigation by updating the docs items in the sidebar configuration. The page should appear in the "Developer Docs" section alongside Database Schema.

### 5. Styling Guidelines

- Use the existing UI components from `@/components/ui/`
- Follow the color scheme with `text-muted-foreground` for descriptions
- Use badges for status indicators and categories
- Implement responsive grid layouts
- Add hover states for interactive elements
- Use consistent spacing with `space-y-8` for main sections

### 6. Data Organization

Structure data as TypeScript interfaces for type safety:

```tsx
interface DocItem {
  name: string;
  description: string;
  category: string;
  metadata: Record<string, any>;
  relatedFiles?: string[];
  status?: 'active' | 'deprecated' | 'beta';
}
```

### 7. Interactive Features (Optional)

- Add search/filter functionality for large documentation sets
- Implement collapsible sections for detailed information
- Add copy-to-clipboard for code snippets
- Include links to source files in the repository

### 8. Example Output

The page should provide developers with:
- Quick reference information
- Clear categorization
- Visual hierarchy
- Actionable details
- Cross-references to related code

---

## Additional Context

This project uses:
- Next.js 14 with App Router
- Cloudflare Workers deployment via OpenNext.js
- Shadcn/ui components
- Tailwind CSS for styling
- TypeScript for type safety

The documentation should be self-contained, requiring no external dependencies beyond what's already in the project.