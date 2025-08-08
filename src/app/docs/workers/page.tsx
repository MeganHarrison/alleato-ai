"use client";

import React from 'react';
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { 
  Globe, 
  Clock, 
  Database,
  FileText,
  RefreshCw,
  Brain,
  Search,
  Settings,
  AlertCircle
} from "lucide-react";

interface WorkerInfo {
  name: string;
  description: string;
  type: 'sync' | 'api' | 'rag' | 'scheduled';
  schedule?: string;
  endpoints?: string[];
  dependencies: string[];
  envVars: string[];
  status: 'active' | 'development' | 'deprecated';
}

const workers: WorkerInfo[] = [
  {
    name: "d1-notion-sync",
    description: "Synchronizes data from D1 database to Notion workspaces. Handles projects and clients data with conflict resolution.",
    type: "scheduled",
    schedule: "0 */6 * * * (every 6 hours)",
    dependencies: ["@notionhq/client", "D1 Database"],
    envVars: ["NOTION_API_KEY", "NOTION_DATABASE_ID", "ALLEATO_DB"],
    status: "active"
  },
  {
    name: "notion-to-d1-sync",
    description: "Pulls data from Notion databases and syncs to D1. Maintains data consistency and handles Notion API rate limits.",
    type: "scheduled",
    schedule: "0 */4 * * * (every 4 hours)",
    dependencies: ["@notionhq/client", "D1 Database"],
    envVars: ["NOTION_API_KEY", "NOTION_DATABASE_ID", "ALLEATO_DB"],
    status: "active"
  },
  {
    name: "fireflies-rag-worker",
    description: "Processes meeting transcripts from Fireflies.ai, generates embeddings, and enables semantic search across meeting content.",
    type: "rag",
    endpoints: ["/webhook", "/search", "/sync"],
    dependencies: ["Vectorize", "D1 Database", "OpenAI API"],
    envVars: ["FIREFLIES_API_KEY", "OPENAI_API_KEY", "VECTORIZE_INDEX"],
    status: "active"
  },
  {
    name: "search-api-worker",
    description: "Handles search queries across projects, documents, and meeting transcripts using vector similarity and full-text search.",
    type: "api",
    endpoints: ["/search", "/suggestions"],
    dependencies: ["Vectorize", "D1 Database"],
    envVars: ["VECTORIZE_INDEX", "ALLEATO_DB"],
    status: "active"
  },
  {
    name: "r2-d1-sync-worker",
    description: "Synchronizes document metadata between R2 storage and D1 database, maintains searchable text extraction.",
    type: "sync",
    dependencies: ["R2 Storage", "D1 Database"],
    envVars: ["R2_BUCKET_NAME", "ALLEATO_DB"],
    status: "development"
  },
  {
    name: "sync-worker",
    description: "Main worker for generating project insights, analytics, and dashboard data aggregation.",
    type: "scheduled",
    schedule: "0 0 * * * (daily)",
    dependencies: ["D1 Database"],
    envVars: ["ALLEATO_DB"],
    status: "active"
  }
];

const typeIcons = {
  sync: <RefreshCw className="h-5 w-5" />,
  api: <Globe className="h-5 w-5" />,
  rag: <Brain className="h-5 w-5" />,
  scheduled: <Clock className="h-5 w-5" />
};

const typeColors = {
  sync: "blue",
  api: "green",
  rag: "purple",
  scheduled: "orange"
};

const statusColors = {
  active: "green",
  development: "yellow",
  deprecated: "red"
};

export default function WorkersDocPage() {
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  
  const types = Array.from(new Set(workers.map(w => w.type)));
  const filteredWorkers = selectedType 
    ? workers.filter(w => w.type === selectedType)
    : workers;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Cloudflare Workers Documentation</h1>
          <p className="text-muted-foreground">
            Overview of all Workers powering the Alleato AI platform
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total Workers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{workers.length}</div>
              <p className="text-sm text-muted-foreground">Deployed workers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Active Workers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {workers.filter(w => w.status === 'active').length}
              </div>
              <p className="text-sm text-muted-foreground">In production</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Scheduled Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {workers.filter(w => w.type === 'scheduled').length}
              </div>
              <p className="text-sm text-muted-foreground">Cron workers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">API Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {workers.reduce((acc, w) => acc + (w.endpoints?.length || 0), 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total endpoints</p>
            </CardContent>
          </Card>
        </div>

        {/* Type Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              selectedType === null 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            All Workers ({workers.length})
          </button>
          {types.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                selectedType === type 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {typeIcons[type as keyof typeof typeIcons]}
              {type.charAt(0).toUpperCase() + type.slice(1)} 
              ({workers.filter(w => w.type === type).length})
            </button>
          ))}
        </div>

        {/* Workers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {filteredWorkers.map((worker) => (
            <Card key={worker.name} className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {typeIcons[worker.type]}
                    <Badge variant="outline">
                      {worker.type}
                    </Badge>
                  </div>
                  <Badge
                    variant={worker.status === 'active' ? 'default' : 'secondary'}
                    className={`
                      ${worker.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      ${worker.status === 'development' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${worker.status === 'deprecated' ? 'bg-red-100 text-red-800' : ''}
                    `}
                  >
                    {worker.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-mono">{worker.name}</CardTitle>
                <CardDescription>{worker.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {worker.schedule && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Schedule
                    </h4>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {worker.schedule}
                    </code>
                  </div>
                )}
                
                {worker.endpoints && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Endpoints
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {worker.endpoints.map(endpoint => (
                        <code key={endpoint} className="text-sm bg-muted px-2 py-1 rounded">
                          {endpoint}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Environment Variables
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {worker.envVars.map(env => (
                      <code key={env} className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {env}
                      </code>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Dependencies
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {worker.dependencies.map(dep => (
                      <Badge key={dep} variant="secondary" className="text-xs">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Deployment Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Deployment Instructions</CardTitle>
            <CardDescription>How to deploy and manage Workers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Deploy a Worker</h3>
              <CodeBlock
                code={`# Navigate to worker directory
cd workers/[worker-name]

# Install dependencies
npm install

# Deploy to Cloudflare
npm run deploy

# Or use wrangler directly
wrangler deploy`}
                language="bash"
              />
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">View Worker Logs</h3>
              <CodeBlock
                code={`# Tail logs for a specific worker
wrangler tail [worker-name]

# View logs in dashboard
# Visit: https://dash.cloudflare.com/[account-id]/workers/services/view/[worker-name]/production/logs`}
                language="bash"
              />
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Update Environment Variables</h3>
              <CodeBlock
                code={`# Set a secret
wrangler secret put VARIABLE_NAME

# List secrets
wrangler secret list

# Delete a secret
wrangler secret delete VARIABLE_NAME`}
                language="bash"
              />
            </div>
          </CardContent>
        </Card>

        {/* Common Patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Common Worker Patterns</CardTitle>
            <CardDescription>Code examples and best practices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">D1 Database Query</h3>
              <CodeBlock
                code={`export default {
  async fetch(request: Request, env: Env) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM projects WHERE status = ?"
    ).bind("active").all();
    
    return Response.json({ projects: results });
  }
}`}
                language="typescript"
                filename="worker.ts"
              />
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Scheduled Worker</h3>
              <CodeBlock
                code={`export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Your scheduled logic here
    await syncDataFromNotion(env);
    
    console.log("Sync completed at", new Date().toISOString());
  }
}`}
                language="typescript"
                filename="scheduled-worker.ts"
              />
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Webhook Handler</h3>
              <CodeBlock
                code={`export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    
    const payload = await request.json();
    
    // Verify webhook signature
    const signature = request.headers.get("X-Webhook-Signature");
    if (!verifySignature(payload, signature, env.WEBHOOK_SECRET)) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    // Process webhook
    await processWebhook(payload, env);
    
    return new Response("OK", { status: 200 });
  }
}`}
                language="typescript"
                filename="webhook-worker.ts"
              />
            </div>
          </CardContent>
        </Card>

        {/* Warning Box */}
        <div className="mt-8 p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                Important Notes
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>• Always test Workers in development before deploying to production</li>
                <li>• Monitor usage to stay within Cloudflare's limits</li>
                <li>• Use wrangler secrets for sensitive environment variables</li>
                <li>• Enable logging for debugging production issues</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}