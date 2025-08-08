"use client";

import React from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileCode, Globe, Brain, BarChart, Users } from "lucide-react";

interface TableInfo {
  name: string;
  description: string;
  category: string;
  associatedWorkers: string[];
  associatedFiles: string[];
  keyFields?: string[];
}

const databaseTables: TableInfo[] = [
  // Core Business Tables
  {
    name: "projects",
    description: "Central project management table storing all project information including budgets, timelines, and status",
    category: "Core Business",
    associatedWorkers: ["sync-worker.ts", "notion-to-d1-sync", "d1-notion-sync"],
    associatedFiles: ["/api/list-d1-projects", "/api/check-d1-projects", "/api/sync-notion-to-d1", "projects-table-with-sync.tsx"],
    keyFields: ["id", "title", "client_id", "status", "budget", "estimated_value"]
  },
  {
    name: "clients",
    description: "Store client/customer information with contact details and business metadata",
    category: "Core Business",
    associatedWorkers: ["notion-to-d1-sync", "d1-notion-sync"],
    associatedFiles: ["/api/clients", "/api/sync-clients-to-notion", "clients-table.tsx"],
    keyFields: ["id", "company_name", "email", "notion_id"]
  },
  {
    name: "employees",
    description: "Employee records including roles, departments, and compensation details",
    category: "Core Business",
    associatedWorkers: ["sync-worker.ts"],
    associatedFiles: ["Project assignment queries"],
    keyFields: ["id", "first_name", "last_name", "role", "department"]
  },
  {
    name: "tasks",
    description: "Project task management with assignments, priorities, and deadlines",
    category: "Core Business",
    associatedWorkers: ["sync-worker.ts"],
    associatedFiles: ["Project insight generation"],
    keyFields: ["id", "project_id", "assigned_to", "status", "due_date"]
  },
  {
    name: "estimates",
    description: "Project estimates and quotes with financial details",
    category: "Core Business",
    associatedWorkers: [],
    associatedFiles: ["Financial tracking components"],
    keyFields: ["id", "project_id", "total_amount", "status"]
  },
  {
    name: "expenses",
    description: "Track project expenses and receipts",
    category: "Core Business",
    associatedWorkers: ["sync-worker.ts"],
    associatedFiles: ["Financial reporting APIs"],
    keyFields: ["id", "project_id", "amount", "category"]
  },
  {
    name: "subcontractors",
    description: "Manage subcontractor information and certifications",
    category: "Core Business",
    associatedWorkers: [],
    associatedFiles: ["Vendor management"],
    keyFields: ["id", "company_name", "specialty", "rating"]
  },
  
  // Meeting & RAG Tables
  {
    name: "meetings",
    description: "Store meeting transcripts and metadata from Fireflies integration",
    category: "Meetings & RAG",
    associatedWorkers: ["fireflies-rag-worker", "sync-worker.ts"],
    associatedFiles: ["/api/sync-meetings", "meetings/page.tsx"],
    keyFields: ["id", "title", "date", "fireflies_id", "summary"]
  },
  {
    name: "meeting_chunks",
    description: "Vectorized chunks of meeting transcripts for semantic search",
    category: "Meetings & RAG",
    associatedWorkers: ["fireflies-rag-worker"],
    associatedFiles: ["Vector search implementation"],
    keyFields: ["id", "meeting_id", "content", "embedding"]
  },
  {
    name: "webhook_events",
    description: "Log incoming webhook events from Fireflies for processing",
    category: "Meetings & RAG",
    associatedWorkers: ["fireflies-rag-worker"],
    associatedFiles: ["Webhook handler"],
    keyFields: ["event_type", "fireflies_id", "processed"]
  },
  {
    name: "vector_index",
    description: "Optimize vector similarity searches for meeting content",
    category: "Meetings & RAG",
    associatedWorkers: ["fireflies-rag-worker"],
    associatedFiles: ["Vector search optimization"],
    keyFields: ["chunk_id", "meeting_id", "relevance_score"]
  },
  {
    name: "processing_queue",
    description: "Queue for asynchronous processing tasks",
    category: "Meetings & RAG",
    associatedWorkers: ["fireflies-rag-worker"],
    associatedFiles: ["Background job processing"],
    keyFields: ["meeting_id", "task_type", "status"]
  },
  
  // Document Tables
  {
    name: "document_metadata",
    description: "Store metadata for all documents in R2 storage with search capabilities",
    category: "Documents",
    associatedWorkers: ["r2-d1-sync-worker.ts", "RAG workers"],
    associatedFiles: ["/api/documents", "Document search components"],
    keyFields: ["id", "filename", "r2_key", "searchable_text"]
  },
  {
    name: "document_relationships",
    description: "Track relationships and dependencies between documents",
    category: "Documents",
    associatedWorkers: [],
    associatedFiles: ["Document graph navigation"],
    keyFields: ["source_document_id", "target_document_id", "relationship_type"]
  },
  
  // Analytics Tables
  {
    name: "project_insights",
    description: "AI-generated project summaries, recommendations, and key insights",
    category: "Analytics",
    associatedWorkers: ["sync-worker.ts"],
    associatedFiles: ["Dashboard components"],
    keyFields: ["id", "project_id", "insight_type", "summary"]
  },
  {
    name: "sync_analytics",
    description: "Track synchronization operations and performance metrics",
    category: "Analytics",
    associatedWorkers: ["All sync workers"],
    associatedFiles: ["Admin monitoring dashboards"],
    keyFields: ["sync_date", "sync_type", "documents_processed"]
  },
  {
    name: "query_analytics",
    description: "Monitor search query performance and usage patterns",
    category: "Analytics",
    associatedWorkers: [],
    associatedFiles: ["Performance monitoring"],
    keyFields: ["query_type", "execution_time_ms", "result_count"]
  },
  {
    name: "interactions",
    description: "Log user interactions for system improvement",
    category: "Analytics",
    associatedWorkers: [],
    associatedFiles: ["Usage tracking"],
    keyFields: ["query", "response_length", "session_id"]
  },
  {
    name: "search_queries",
    description: "Log search queries for optimization and insights",
    category: "Analytics",
    associatedWorkers: [],
    associatedFiles: ["Search improvement"],
    keyFields: ["query", "results_count", "user_satisfaction"]
  },
  
  // System Tables
  {
    name: "system_metadata",
    description: "Store system configuration and state information",
    category: "System",
    associatedWorkers: ["Various workers"],
    associatedFiles: ["System initialization"],
    keyFields: ["key", "value", "updated_at"]
  },
  {
    name: "contacts",
    description: "Store contact information for client representatives",
    category: "Core Business",
    associatedWorkers: [],
    associatedFiles: ["Client relationship management"],
    keyFields: ["id", "first_name", "last_name", "client_id"]
  },
  {
    name: "project_subcontractors",
    description: "Link subcontractors to specific projects with contract details",
    category: "Core Business",
    associatedWorkers: [],
    associatedFiles: ["Project resource allocation"],
    keyFields: ["project_id", "subcontractor_id", "contract_amount"]
  }
];

const categoryIcons = {
  "Core Business": <Users className="h-5 w-5" />,
  "Meetings & RAG": <Brain className="h-5 w-5" />,
  "Documents": <FileCode className="h-5 w-5" />,
  "Analytics": <BarChart className="h-5 w-5" />,
  "System": <Database className="h-5 w-5" />
};

const categoryColors = {
  "Core Business": "blue",
  "Meetings & RAG": "purple",
  "Documents": "green",
  "Analytics": "orange",
  "System": "gray"
};

export default function DatabaseSchemaPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  
  const categories = Array.from(new Set(databaseTables.map(t => t.category)));
  const filteredTables = selectedCategory 
    ? databaseTables.filter(t => t.category === selectedCategory)
    : databaseTables;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Database Schema Documentation</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of all tables in the Alleato D1 database (ID: fc7c9a6d-ca65-4768-b3f9-07ec5afb38c5)
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === null 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            All Tables ({databaseTables.length})
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                selectedCategory === category 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {categoryIcons[category as keyof typeof categoryIcons]}
              {category} ({databaseTables.filter(t => t.category === category).length})
            </button>
          ))}
        </div>

        {/* Database Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{databaseTables.length}</div>
              <p className="text-sm text-muted-foreground">Database objects</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Active Workers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">6</div>
              <p className="text-sm text-muted-foreground">Processing data</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">API Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">15+</div>
              <p className="text-sm text-muted-foreground">Endpoints</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">7</div>
              <p className="text-sm text-muted-foreground">Virtual tables</p>
            </CardContent>
          </Card>
        </div>

        {/* Tables List */}
        <Card>
          <CardHeader>
            <CardTitle>Database Tables</CardTitle>
            <CardDescription>
              {selectedCategory ? `Showing ${selectedCategory} tables` : 'All tables and their associations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Table Name</TableHead>
                    <TableHead className="min-w-[100px]">Category</TableHead>
                    <TableHead className="min-w-[300px]">Description</TableHead>
                    <TableHead className="min-w-[200px]">Associated Workers</TableHead>
                    <TableHead className="min-w-[200px]">Associated Files/APIs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTables.map((table) => (
                    <TableRow key={table.name}>
                      <TableCell className="font-mono font-semibold">
                        {table.name}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className="flex items-center gap-1 w-fit"
                        >
                          {categoryIcons[table.category as keyof typeof categoryIcons]}
                          {table.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {table.description}
                        {table.keyFields && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Key fields: {table.keyFields.join(", ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {table.associatedWorkers.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {table.associatedWorkers.map((worker, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                {worker}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {table.associatedFiles.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {table.associatedFiles.slice(0, 3).map((file, idx) => (
                              <code key={idx} className="text-xs bg-muted px-1 py-0.5 rounded">
                                {file}
                              </code>
                            ))}
                            {table.associatedFiles.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{table.associatedFiles.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Views</CardTitle>
              <CardDescription>Virtual tables for common queries</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Badge variant="outline">VIEW</Badge>
                  <span className="font-mono text-sm">active_projects_dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">VIEW</Badge>
                  <span className="font-mono text-sm">recent_activity</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">VIEW</Badge>
                  <span className="font-mono text-sm">client_performance</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">VIEW</Badge>
                  <span className="font-mono text-sm">project_summary</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">VIEW</Badge>
                  <span className="font-mono text-sm">monthly_activity</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">VIEW</Badge>
                  <span className="font-mono text-sm">high_priority_items</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">VIEW</Badge>
                  <span className="font-mono text-sm">recent_documents</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Workers</CardTitle>
              <CardDescription>Background processes managing data</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li>
                  <div className="font-semibold text-sm">sync-worker.ts</div>
                  <div className="text-xs text-muted-foreground">Main query worker for insights</div>
                </li>
                <li>
                  <div className="font-semibold text-sm">fireflies-rag-worker</div>
                  <div className="text-xs text-muted-foreground">Processes meeting transcripts</div>
                </li>
                <li>
                  <div className="font-semibold text-sm">notion-to-d1-sync</div>
                  <div className="text-xs text-muted-foreground">Syncs from Notion to D1</div>
                </li>
                <li>
                  <div className="font-semibold text-sm">d1-notion-sync</div>
                  <div className="text-xs text-muted-foreground">Syncs from D1 to Notion</div>
                </li>
                <li>
                  <div className="font-semibold text-sm">r2-d1-sync-worker</div>
                  <div className="text-xs text-muted-foreground">Syncs document metadata</div>
                </li>
                <li>
                  <div className="font-semibold text-sm">search-api-worker</div>
                  <div className="text-xs text-muted-foreground">Handles search queries</div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}