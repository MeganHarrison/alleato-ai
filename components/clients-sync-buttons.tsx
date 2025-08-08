'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ClientsSyncButtonsProps {
  onSyncComplete?: () => void;
}

export function ClientsSyncButtons({ onSyncComplete }: ClientsSyncButtonsProps) {
  const [isLoadingD1ToNotion, setIsLoadingD1ToNotion] = useState(false);
  const [isLoadingNotionToD1, setIsLoadingNotionToD1] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [syncDirection, setSyncDirection] = useState<'d1-to-notion' | 'notion-to-d1'>('d1-to-notion');

  const handleD1ToNotionSync = async () => {
    setIsLoadingD1ToNotion(true);
    setSyncDirection('d1-to-notion');
    
    try {
      const response = await fetch('/api/sync-clients-to-notion', {
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
        toast.success('D1 to Notion sync completed', {
          description: `Created: ${created}, Updated: ${updated}, Errors: ${errors}`,
        });
        onSyncComplete?.();
      }
    } catch (error) {
      toast.error('Failed to sync', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoadingD1ToNotion(false);
    }
  };

  const handleNotionToD1Sync = async () => {
    setIsLoadingNotionToD1(true);
    setSyncDirection('notion-to-d1');
    
    try {
      const response = await fetch('/api/sync-notion-clients-to-d1', {
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
        toast.success('Notion to D1 sync completed', {
          description: `Created: ${created}, Updated: ${updated}, Errors: ${errors}`,
        });
        onSyncComplete?.();
      }
    } catch (error) {
      toast.error('Failed to sync', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoadingNotionToD1(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={handleNotionToD1Sync}
          disabled={isLoadingNotionToD1}
          variant="outline"
          size="sm"
        >
          <Download className={`mr-2 h-4 w-4 ${isLoadingNotionToD1 ? 'animate-pulse' : ''}`} />
          {isLoadingNotionToD1 ? 'Syncing...' : 'Import from Notion'}
        </Button>
        
        <Button
          onClick={handleD1ToNotionSync}
          disabled={isLoadingD1ToNotion}
          variant="outline"
          size="sm"
        >
          <Upload className={`mr-2 h-4 w-4 ${isLoadingD1ToNotion ? 'animate-pulse' : ''}`} />
          {isLoadingD1ToNotion ? 'Syncing...' : 'Export to Notion'}
        </Button>
      </div>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {syncDirection === 'd1-to-notion' ? 'D1 to Notion' : 'Notion to D1'} Sync Results
            </DialogTitle>
            <DialogDescription>
              Clients sync operation completed
            </DialogDescription>
          </DialogHeader>
          
          {syncResults && (
            <div className="space-y-4">
              {syncResults.summary && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Total Clients: {syncResults.summary.total}</div>
                    <div>Created: {syncResults.summary.created}</div>
                    <div>Updated: {syncResults.summary.updated}</div>
                    <div>Errors: {syncResults.summary.errors}</div>
                  </div>
                </div>
              )}
              
              {syncResults.results && syncResults.results.length > 0 && (
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
                        <span className="font-medium">{result.client}</span>
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