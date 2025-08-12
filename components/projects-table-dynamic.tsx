"use client";

import React, { useState, useEffect } from 'react';
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { D1NotionSyncButton } from "./d1-notion-sync-button";
import { NotionToD1SyncButton } from "./notion-to-d1-sync-button";
import API_ENDPOINTS from "@/lib/config/api";

interface ProjectData {
  id: number;
  header: string;
  type: string;
  status: string;
  target: string;
  limit: string;
  reviewer: string;
  // D1-specific fields
  notion_id?: string;
  priority?: string;
  project_address?: string;
  estimated_value?: number;
  profit_margin?: number;
  created_at?: string;
  updated_at?: string;
}

export function ProjectsTableDynamic() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);

  const fetchProjects = async (showRefreshToast = false) => {
    try {
      setIsRefreshing(showRefreshToast);
      
      const response = await fetch(API_ENDPOINTS.projects);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch projects');
      }

      setProjects(data.projects || []);
      setUsingMockData(data.usingMockData || false);
      
      if (showRefreshToast) {
        if (data.usingMockData) {
          toast.success(`Projects refreshed: ${data.total} found (using mock data)`);
        } else {
          toast.success(`Projects refreshed: ${data.total} found`);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      setProjects([]); // Set empty array on error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Refresh data after sync operations
  const handleSyncComplete = () => {
    fetchProjects(true);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading projects from database...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            Manage and sync your projects with Notion ({projects.length} projects)
            {usingMockData && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                Using mock data - D1 database not configured
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => fetchProjects(true)}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <NotionToD1SyncButton onSyncComplete={handleSyncComplete} />
          <D1NotionSyncButton onSyncComplete={handleSyncComplete} />
        </div>
      </div>
      
      <DataTable data={projects} />
    </div>
  );
}