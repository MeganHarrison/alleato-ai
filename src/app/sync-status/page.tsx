'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Database,
  Cloud,
  FileText,
  Users,
  Zap,
  Activity,
  Upload
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import API_ENDPOINTS from '@/lib/config/api';

interface SyncStatus {
  service: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  count?: number;
  lastSync?: string;
  details?: any;
}

export default function SyncStatusPage() {
  const [statuses, setStatuses] = useState<SyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const checkAllStatuses = async () => {
    setLoading(true);
    const newStatuses: SyncStatus[] = [];

    // Check R2 Storage
    try {
      const r2Response = await fetch(API_ENDPOINTS.testR2);
      const r2Data = await r2Response.json();
      newStatuses.push({
        service: 'R2 Storage',
        status: r2Data.firefliesConnected ? 'success' : 'error',
        message: r2Data.firefliesConnected ? 'Connected to Fireflies R2 storage' : 'Failed to connect to R2',
        count: r2Data.count,
        details: r2Data
      });
    } catch (error) {
      newStatuses.push({
        service: 'R2 Storage',
        status: 'error',
        message: 'Failed to check R2 status',
        details: error
      });
    }

    // Check Meetings in R2
    try {
      const meetingsResponse = await fetch(API_ENDPOINTS.meetings);
      const meetingsData = await meetingsResponse.json();
      newStatuses.push({
        service: 'Meeting Files',
        status: meetingsData.files && meetingsData.files.length > 0 ? 'success' : 'warning',
        message: `${meetingsData.files?.length || 0} meeting transcripts in R2`,
        count: meetingsData.files?.length || 0,
        details: {
          totalObjects: meetingsData.totalObjects,
          sampleFiles: meetingsData.files?.slice(0, 3)
        }
      });
    } catch (error) {
      newStatuses.push({
        service: 'Meeting Files',
        status: 'error',
        message: 'Failed to fetch meetings from R2',
        details: error
      });
    }

    // Check D1 Database - Meetings
    try {
      const d1Response = await fetch(API_ENDPOINTS.checkD1Projects);
      const d1Data = await d1Response.json();
      
      if (d1Data.success) {
        // Also check meetings table
        const meetingsInD1 = d1Data.tables?.find((t: any) => t.name === 'meetings');
        newStatuses.push({
          service: 'D1 Database - Meetings',
          status: meetingsInD1 ? 'success' : 'warning',
          message: meetingsInD1 ? `Meetings table exists with ${meetingsInD1.count || 0} records` : 'Meetings table not found',
          count: meetingsInD1?.count || 0,
          details: d1Data
        });
      } else {
        newStatuses.push({
          service: 'D1 Database - Meetings',
          status: 'error',
          message: d1Data.error || 'Failed to connect to D1',
          details: d1Data
        });
      }
    } catch (error) {
      newStatuses.push({
        service: 'D1 Database - Meetings',
        status: 'error',
        message: 'Failed to check D1 database',
        details: error
      });
    }

    // Check D1 Database - Projects
    try {
      const projectsResponse = await fetch(API_ENDPOINTS.listD1Projects);
      const projectsData = await projectsResponse.json();
      newStatuses.push({
        service: 'D1 Database - Projects',
        status: projectsData.success ? 'success' : 'warning',
        message: `${projectsData.projects?.length || 0} projects in D1`,
        count: projectsData.projects?.length || 0,
        details: projectsData
      });
    } catch (error) {
      newStatuses.push({
        service: 'D1 Database - Projects',
        status: 'error',
        message: 'Failed to fetch projects from D1',
        details: error
      });
    }

    // Check Notion Connection
    try {
      const notionResponse = await fetch(API_ENDPOINTS.notionSchema);
      const notionData = await notionResponse.json();
      newStatuses.push({
        service: 'Notion API',
        status: notionData.success ? 'success' : 'error',
        message: notionData.success ? 'Connected to Notion database' : notionData.error || 'Failed to connect to Notion',
        details: notionData
      });
    } catch (error) {
      newStatuses.push({
        service: 'Notion API',
        status: 'error',
        message: 'Failed to check Notion connection',
        details: error
      });
    }

    // Check Clients Table
    try {
      const clientsResponse = await fetch(API_ENDPOINTS.clients);
      const clientsData = await clientsResponse.json();
      newStatuses.push({
        service: 'D1 Database - Clients',
        status: clientsData.success ? 'success' : 'warning',
        message: `${clientsData.clients?.length || 0} clients in D1`,
        count: clientsData.clients?.length || 0,
        details: clientsData
      });
    } catch (error) {
      newStatuses.push({
        service: 'D1 Database - Clients',
        status: 'error',
        message: 'Failed to fetch clients from D1',
        details: error
      });
    }

    // Check Vectorization Status
    try {
      const vectorResponse = await fetch(API_ENDPOINTS.vectorizationStatus);
      const vectorData = await vectorResponse.json();
      newStatuses.push({
        service: 'Vectorization',
        status: vectorData.indexed_documents > 0 ? 'success' : 'warning',
        message: `${vectorData.indexed_documents || 0} documents vectorized`,
        count: vectorData.indexed_documents || 0,
        details: vectorData
      });
    } catch (error) {
      newStatuses.push({
        service: 'Vectorization',
        status: 'error',
        message: 'Failed to check vectorization status',
        details: error
      });
    }

    setStatuses(newStatuses);
    setLoading(false);
  };

  const syncService = async (service: string) => {
    setSyncing(service);
    
    try {
      let response;
      switch(service) {
        case 'Meeting Files':
          response = await fetch(API_ENDPOINTS.syncMeetings, { method: 'POST' });
          break;
        case 'D1 Database - Meetings':
          response = await fetch(API_ENDPOINTS.syncMeetingsToD1, { method: 'POST' });
          break;
        case 'D1 Database - Projects':
          response = await fetch(API_ENDPOINTS.syncNotionToD1, { method: 'POST' });
          break;
        case 'D1 Database - Clients':
          response = await fetch(API_ENDPOINTS.syncNotionClientsToD1, { method: 'POST' });
          break;
        case 'Vectorization':
          response = await fetch(API_ENDPOINTS.vectorizationProcess, { method: 'POST' });
          break;
        default:
          throw new Error('Unknown service');
      }
      
      const data = await response.json();
      console.log(`Sync result for ${service}:`, data);
      
      // Refresh statuses after sync
      await checkAllStatuses();
    } catch (error) {
      console.error(`Error syncing ${service}:`, error);
    }
    
    setSyncing(null);
  };

  const runFullSync = async () => {
    // Run all syncs in sequence
    const syncSequence = [
      'Meeting Files',
      'D1 Database - Meetings',
      'D1 Database - Projects', 
      'D1 Database - Clients',
      'Vectorization'
    ];
    
    for (const service of syncSequence) {
      await syncService(service);
    }
  };

  useEffect(() => {
    checkAllStatuses();
  }, []);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getServiceIcon = (service: string) => {
    if (service.includes('R2')) return <Cloud className="h-5 w-5" />;
    if (service.includes('Meeting')) return <Users className="h-5 w-5" />;
    if (service.includes('D1')) return <Database className="h-5 w-5" />;
    if (service.includes('Notion')) return <FileText className="h-5 w-5" />;
    if (service.includes('Vector')) return <Zap className="h-5 w-5" />;
    return <Activity className="h-5 w-5" />;
  };

  const canSync = (service: string) => {
    return ['Meeting Files', 'D1 Database - Meetings', 'D1 Database - Projects', 'D1 Database - Clients', 'Vectorization'].includes(service);
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Sync Status Dashboard</h1>
          <p className="text-gray-600">
            Monitor and verify all integrations and sync operations
          </p>
        </div>

        <div className="mb-6 flex gap-4">
          <Button onClick={checkAllStatuses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <Button onClick={runFullSync} variant="default" disabled={syncing !== null}>
            <Upload className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Run Full Sync
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Checking all services...</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {statuses.map((status, index) => (
              <Card key={index} className={`border-l-4 ${
                status.status === 'success' ? 'border-l-green-500' :
                status.status === 'error' ? 'border-l-red-500' :
                status.status === 'warning' ? 'border-l-yellow-500' :
                'border-l-gray-500'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getServiceIcon(status.service)}
                      <CardTitle className="text-lg">{status.service}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status.status)}
                      {canSync(status.service) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncService(status.service)}
                          disabled={syncing === status.service}
                        >
                          {syncing === status.service ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            'Sync'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2">{status.message}</p>
                  {status.count !== undefined && (
                    <p className="text-2xl font-bold">{status.count}</p>
                  )}
                  {status.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View details
                      </summary>
                      <pre className="text-xs mt-2 p-2 bg-gray-50 rounded overflow-auto max-h-32">
                        {JSON.stringify(status.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sync Order:</strong> For best results, sync in this order:
            <ol className="list-decimal list-inside mt-2">
              <li>Meeting Files (from Fireflies to R2)</li>
              <li>D1 Database - Meetings (from R2 to D1)</li>
              <li>D1 Database - Projects (from Notion to D1)</li>
              <li>D1 Database - Clients (from Notion to D1)</li>
              <li>Vectorization (process all documents)</li>
            </ol>
          </AlertDescription>
        </Alert>
      </div>
    </AppLayout>
  );
}