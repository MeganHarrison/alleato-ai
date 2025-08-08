"use client";

import React from 'react';
import AppLayout from "@/components/layout/AppLayout";
import { DocCard } from "@/components/docs/DocCard";
import { DocSearch } from "@/components/docs/DocSearch";
import { 
  Database, 
  Globe, 
  FileText, 
  BookOpen, 
  Code, 
  Map,
  Puzzle,
  Settings,
  BarChart3,
  Users,
  Rocket,
  HelpCircle
} from "lucide-react";

export default function DocsPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Everything you need to know about Alleato AI. From getting started to advanced features.
          </p>
          <div className="flex justify-center">
            <DocSearch />
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="#getting-started" className="text-sm text-primary hover:underline">
              Getting Started
            </a>
            <span className="text-muted-foreground">•</span>
            <a href="#developer" className="text-sm text-primary hover:underline">
              Developer Docs
            </a>
            <span className="text-muted-foreground">•</span>
            <a href="#features" className="text-sm text-primary hover:underline">
              Features
            </a>
            <span className="text-muted-foreground">•</span>
            <a href="#integrations" className="text-sm text-primary hover:underline">
              Integrations
            </a>
          </div>
        </div>

        {/* Getting Started Section */}
        <section id="getting-started" className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DocCard
              title="Quick Start Guide"
              description="Get up and running with Alleato AI in minutes. Learn the basics and core concepts."
              href="/docs/getting-started"
              icon={Rocket}
              badge="Start Here"
            />
            <DocCard
              title="Features Overview"
              description="Explore all the features available in Alleato AI, from project management to AI assistance."
              href="/docs/features"
              icon={BookOpen}
            />
            <DocCard
              title="Site Map"
              description="Visual overview of all pages and navigation paths in the application."
              href="/docs/site-map"
              icon={Map}
            />
          </div>
        </section>

        {/* Developer Documentation */}
        <section id="developer" className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Developer Documentation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DocCard
              title="Database Schema"
              description="Comprehensive documentation of all database tables, relationships, and data models."
              href="/database-schema"
              icon={Database}
            />
            <DocCard
              title="Cloudflare Workers"
              description="Guide to all Workers including sync processes, RAG implementation, and scheduled jobs."
              href="/docs/workers"
              icon={Globe}
            />
            <DocCard
              title="API Reference"
              description="Complete API documentation with endpoints, authentication, and code examples."
              href="/docs/api-reference"
              icon={Code}
            />
            <DocCard
              title="Architecture Overview"
              description="System design, data flow diagrams, and technical architecture documentation."
              href="/docs/architecture"
              icon={BarChart3}
            />
            <DocCard
              title="Deployment Guide"
              description="Step-by-step instructions for deploying to Cloudflare Workers and Pages."
              href="/docs/deployment"
              icon={Settings}
            />
            <DocCard
              title="Environment Setup"
              description="Configure environment variables, API keys, and local development setup."
              href="/docs/configuration"
              icon={Settings}
            />
          </div>
        </section>

        {/* Features Documentation */}
        <section id="features" className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DocCard
              title="Project Management"
              description="Learn how to create, manage, and track projects with budgets and timelines."
              href="/docs/features/projects"
              icon={FileText}
            />
            <DocCard
              title="Client Management"
              description="Manage client relationships, contacts, and business information."
              href="/docs/features/clients"
              icon={Users}
            />
            <DocCard
              title="AI Assistant"
              description="Use the AI chat assistant for insights, queries, and intelligent assistance."
              href="/docs/features/ai-assistant"
              icon={HelpCircle}
            />
            <DocCard
              title="Meeting Insights"
              description="Process and search meeting transcripts with AI-powered analysis."
              href="/docs/features/meetings"
              icon={FileText}
            />
            <DocCard
              title="Document Management"
              description="Upload, organize, and search documents with full-text capabilities."
              href="/docs/features/documents"
              icon={FileText}
            />
            <DocCard
              title="Analytics & Reports"
              description="Generate insights and reports from your project and client data."
              href="/docs/features/analytics"
              icon={BarChart3}
            />
          </div>
        </section>

        {/* Integrations */}
        <section id="integrations" className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DocCard
              title="Notion Integration"
              description="Set up bidirectional sync between Alleato AI and your Notion workspace."
              href="/docs/integrations/notion"
              icon={Puzzle}
              badge="Popular"
            />
            <DocCard
              title="Fireflies.ai Setup"
              description="Configure automatic meeting transcript ingestion from Fireflies."
              href="/docs/integrations/fireflies"
              icon={Puzzle}
            />
            <DocCard
              title="API Integration"
              description="Integrate Alleato AI with your existing tools using our REST API."
              href="/docs/integrations/api"
              icon={Puzzle}
            />
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Can't find what you're looking for?{' '}
            <a href="/docs/support" className="text-primary hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}