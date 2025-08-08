"use client";

import React from 'react';
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Home,
  MessageSquare,
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Database,
  Globe,
  Book,
  Settings,
  Lock,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface PageInfo {
  path: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  authRequired: boolean;
  category: string;
  subPages?: PageInfo[];
}

const siteStructure: PageInfo[] = [
  {
    path: "/",
    title: "Home",
    description: "Landing page",
    icon: <Home className="h-4 w-4" />,
    authRequired: false,
    category: "Public"
  },
  {
    path: "/signin",
    title: "Sign In",
    description: "User authentication",
    icon: <Lock className="h-4 w-4" />,
    authRequired: false,
    category: "Authentication"
  },
  {
    path: "/signup",
    title: "Sign Up",
    description: "Create new account",
    icon: <Lock className="h-4 w-4" />,
    authRequired: false,
    category: "Authentication"
  },
  {
    path: "/dashboard",
    title: "Dashboard",
    description: "Main dashboard with analytics and insights",
    icon: <LayoutDashboard className="h-4 w-4" />,
    authRequired: true,
    category: "Core Features"
  },
  {
    path: "/chat",
    title: "AI Assistant",
    description: "Chat with AI for insights and help",
    icon: <MessageSquare className="h-4 w-4" />,
    authRequired: true,
    category: "Core Features"
  },
  {
    path: "/tables/projects",
    title: "Projects",
    description: "Project management and tracking",
    icon: <FileText className="h-4 w-4" />,
    authRequired: true,
    category: "Data Management"
  },
  {
    path: "/tables/clients",
    title: "Clients",
    description: "Client relationship management",
    icon: <Users className="h-4 w-4" />,
    authRequired: true,
    category: "Data Management"
  },
  {
    path: "/tables/documents",
    title: "Documents",
    description: "Document library and search",
    icon: <FileText className="h-4 w-4" />,
    authRequired: true,
    category: "Data Management"
  },
  {
    path: "/meetings",
    title: "Meetings",
    description: "Meeting transcripts and insights",
    icon: <Calendar className="h-4 w-4" />,
    authRequired: true,
    category: "Core Features"
  },
  {
    path: "/database-schema",
    title: "Database Schema",
    description: "Database documentation",
    icon: <Database className="h-4 w-4" />,
    authRequired: true,
    category: "Documentation"
  },
  {
    path: "/docs",
    title: "Documentation Hub",
    description: "Main documentation portal",
    icon: <Book className="h-4 w-4" />,
    authRequired: false,
    category: "Documentation",
    subPages: [
      {
        path: "/docs/workers",
        title: "Workers Documentation",
        description: "Cloudflare Workers guide",
        icon: <Globe className="h-4 w-4" />,
        authRequired: false,
        category: "Documentation"
      },
      {
        path: "/docs/site-map",
        title: "Site Map",
        description: "This page - application navigation",
        icon: <FileText className="h-4 w-4" />,
        authRequired: false,
        category: "Documentation"
      }
    ]
  },
  {
    path: "/admin",
    title: "Admin Dashboard",
    description: "Administrative features and settings",
    icon: <Settings className="h-4 w-4" />,
    authRequired: true,
    category: "Admin",
    subPages: [
      {
        path: "/admin/profile",
        title: "User Profile",
        description: "Manage user profile settings",
        icon: <Users className="h-4 w-4" />,
        authRequired: true,
        category: "Admin"
      },
      {
        path: "/admin/bar-chart",
        title: "Bar Charts",
        description: "Chart examples",
        icon: <FileText className="h-4 w-4" />,
        authRequired: true,
        category: "Admin"
      },
      {
        path: "/admin/line-chart",
        title: "Line Charts",
        description: "Chart examples",
        icon: <FileText className="h-4 w-4" />,
        authRequired: true,
        category: "Admin"
      },
      {
        path: "/admin/calendar",
        title: "Calendar",
        description: "Event calendar",
        icon: <Calendar className="h-4 w-4" />,
        authRequired: true,
        category: "Admin"
      },
      {
        path: "/admin/basic-tables",
        title: "Tables",
        description: "Data table examples",
        icon: <FileText className="h-4 w-4" />,
        authRequired: true,
        category: "Admin"
      },
      {
        path: "/admin/form-elements",
        title: "Forms",
        description: "Form components",
        icon: <FileText className="h-4 w-4" />,
        authRequired: true,
        category: "Admin"
      }
    ]
  }
];

// API Routes
const apiRoutes = [
  { path: "/api/chat", method: "POST", description: "AI chat endpoint" },
  { path: "/api/clients", method: "GET", description: "Fetch clients list" },
  { path: "/api/documents", method: "GET", description: "Fetch documents" },
  { path: "/api/sync-notion", method: "POST", description: "Trigger Notion sync" },
  { path: "/api/sync-meetings", method: "POST", description: "Sync Fireflies meetings" },
  { path: "/api/check-d1-projects", method: "GET", description: "Check D1 projects" },
  { path: "/api/list-d1-projects", method: "GET", description: "List D1 projects" },
  { path: "/api/sync-clients-to-notion", method: "POST", description: "Sync clients to Notion" },
  { path: "/api/sync-notion-clients-to-d1", method: "POST", description: "Sync Notion clients to D1" },
  { path: "/api/user", method: "GET", description: "Get user information" }
];

export default function SiteMapPage() {
  const categories = Array.from(new Set(siteStructure.map(page => page.category)));

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Site Map</h1>
          <p className="text-muted-foreground">
            Complete overview of all pages and routes in Alleato AI
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {siteStructure.reduce((acc, page) => acc + 1 + (page.subPages?.length || 0), 0)}
              </div>
              <p className="text-sm text-muted-foreground">Application routes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Public Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {siteStructure.filter(page => !page.authRequired).length}
              </div>
              <p className="text-sm text-muted-foreground">No auth required</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Protected Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {siteStructure.filter(page => page.authRequired).length}
              </div>
              <p className="text-sm text-muted-foreground">Auth required</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">API Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{apiRoutes.length}</div>
              <p className="text-sm text-muted-foreground">REST endpoints</p>
            </CardContent>
          </Card>
        </div>

        {/* Site Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {categories.map(category => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>
                  {siteStructure.filter(page => page.category === category).length} pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {siteStructure
                    .filter(page => page.category === category)
                    .map(page => (
                      <div key={page.path}>
                        <Link href={page.path} className="group">
                          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                            <div className="mt-0.5">{page.icon}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm group-hover:text-primary">
                                  {page.title}
                                </h4>
                                {page.authRequired && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Auth
                                  </Badge>
                                )}
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {page.description}
                              </p>
                              <code className="text-xs text-muted-foreground font-mono">
                                {page.path}
                              </code>
                            </div>
                          </div>
                        </Link>
                        
                        {/* Sub Pages */}
                        {page.subPages && page.subPages.length > 0 && (
                          <div className="ml-12 mt-2 space-y-2">
                            {page.subPages.map(subPage => (
                              <Link key={subPage.path} href={subPage.path} className="group">
                                <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm group-hover:text-primary">
                                    {subPage.title}
                                  </span>
                                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* API Routes */}
        <Card>
          <CardHeader>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>REST API routes available in the application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Method</th>
                    <th className="text-left py-2 px-3 font-medium">Path</th>
                    <th className="text-left py-2 px-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {apiRoutes.map((route, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">
                        <Badge 
                          variant={route.method === 'GET' ? 'secondary' : 'default'}
                          className="font-mono text-xs"
                        >
                          {route.method}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <code className="text-sm font-mono">{route.path}</code>
                      </td>
                      <td className="py-2 px-3 text-sm text-muted-foreground">
                        {route.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Visual Tree */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Visual Site Structure</CardTitle>
            <CardDescription>Tree view of the application hierarchy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm">
              <pre className="overflow-x-auto">
{`/
├── Authentication
│   ├── /signin - Sign In
│   └── /signup - Sign Up
│
├── Core Features
│   ├── /dashboard - Main Dashboard
│   ├── /chat - AI Assistant
│   └── /meetings - Meeting Insights
│
├── Data Management
│   ├── /tables/projects - Projects
│   ├── /tables/clients - Clients
│   └── /tables/documents - Documents
│
├── Documentation
│   ├── /database-schema - Database Schema
│   └── /docs - Documentation Hub
│       ├── /docs/workers - Workers Guide
│       └── /docs/site-map - Site Map
│
└── Admin
    └── /admin - Admin Dashboard
        ├── /admin/profile - User Profile
        ├── /admin/calendar - Calendar
        └── [other admin pages...]`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tips */}
        <div className="mt-8 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-semibold mb-2">Navigation Tips</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Click on any page link to navigate directly</li>
            <li>• Pages marked with a lock icon require authentication</li>
            <li>• Use the search feature (⌘K) to quickly find pages</li>
            <li>• The sidebar provides quick access to main features</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}