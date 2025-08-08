"use client";

import React, { useState } from 'react';
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { IconCloudUpload, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { D1NotionSyncButton } from "./d1-notion-sync-button";
import { NotionToD1SyncButton } from "./notion-to-d1-sync-button";

interface ProjectData {
  id: number;
  header: string;
  type: string;
  status: string;
  target: string;
  limit: string;
  reviewer: string;
}

interface ProjectsTableWithSyncProps {
  data: ProjectData[];
}

export function ProjectsTableWithSync({ data }: ProjectsTableWithSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResults(null);

    try {
      const response = await fetch('/api/sync-notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projects: data }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Sync completed: ${result.summary.created} created, ${result.summary.updated} updated`
        );
        setSyncResults(result);
        setShowSyncDialog(true);
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync with Notion');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
            <p className="text-muted-foreground">
              Manage and sync your projects with Notion
            </p>
          </div>
          <div className="flex gap-2">
            <NotionToD1SyncButton />
            <D1NotionSyncButton />
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="gap-2"
            >
              {isSyncing ? (
                <>
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <IconCloudUpload className="h-4 w-4" />
                  Sync JSON to Notion
                </>
              )}
            </Button>
          </div>
        </div>
        
        <DataTable data={data} />
      </div>

      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Sync Results</DialogTitle>
            <DialogDescription>
              Your projects have been synced with Notion.
            </DialogDescription>
          </DialogHeader>
          
          {syncResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-green-600">
                    {syncResults.summary.created}
                  </p>
                  <p className="text-sm text-muted-foreground">Created</p>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-blue-600">
                    {syncResults.summary.updated}
                  </p>
                  <p className="text-sm text-muted-foreground">Updated</p>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-red-600">
                    {syncResults.summary.errors}
                  </p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>

              {syncResults.summary.errors > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Errors:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {syncResults.results
                      .filter((r: any) => r.status === 'error')
                      .map((r: any, i: number) => (
                        <p key={i} className="text-sm text-red-600">
                          {r.project}: {r.error}
                        </p>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowSyncDialog(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.open(
                  `https://www.notion.so/alleatogroup/18fee3c6d9968192a666fe6b55e99f52`,
                  '_blank'
                );
              }}
            >
              View in Notion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}