'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface D1NotionSyncButtonProps {
  onSyncComplete?: () => void;
}

export function D1NotionSyncButton({ onSyncComplete }: D1NotionSyncButtonProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sync-d1-notion', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Sync failed', {
          description: data.details || 'An error occurred during sync',
        });
        return;
      }

      setSyncResults(data);
      setShowResults(true);

      if (data.summary) {
        const { created, updated, errors } = data.summary;
        toast.success('Sync completed', {
          description: `Created: ${created}, Updated: ${updated}, Errors: ${errors}`,
        });
      }
      
      // Call the completion callback to refresh the parent component
      onSyncComplete?.();
    } catch (error) {
      toast.error('Failed to sync', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleSync}
        disabled={isLoading}
        variant="outline"
        size="sm"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Syncing...' : 'Sync D1 to Notion'}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>D1 to Notion Sync Results</DialogTitle>
            <DialogDescription>
              Summary of the synchronization operation
            </DialogDescription>
          </DialogHeader>
          
          {syncResults && (
            <div className="space-y-4">
              {syncResults.summary && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Total Projects: {syncResults.summary.total}</div>
                    <div>Created: {syncResults.summary.created}</div>
                    <div>Updated: {syncResults.summary.updated}</div>
                    <div>Errors: {syncResults.summary.errors}</div>
                  </div>
                </div>
              )}
              
              {syncResults.results && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Details</h3>
                  <div className="max-h-96 overflow-y-auto">
                    {syncResults.results.map((result: any, index: number) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${
                          result.status === 'error'
                            ? 'bg-red-50 dark:bg-red-900/20'
                            : result.status === 'created'
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'bg-blue-50 dark:bg-blue-900/20'
                        }`}
                      >
                        <span className="font-medium">{result.project}</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {result.status}
                        </span>
                        {result.error && (
                          <div className="text-red-600 dark:text-red-400 text-xs mt-1">
                            {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}