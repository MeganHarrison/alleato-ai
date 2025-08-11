'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';

export default function TestSyncPage() {
  const [r2Status, setR2Status] = useState<any>(null);
  const [firefliesStatus, setFirefliesStatus] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [loading, setLoading] = useState({
    r2: false,
    fireflies: false,
    sync: false,
    upload: false
  });

  const testR2 = async () => {
    console.log('Testing R2 connection...');
    setLoading(prev => ({ ...prev, r2: true }));
    try {
      const response = await fetch('/api/test-r2');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('R2 response:', data);
      setR2Status(data);
    } catch (error) {
      console.error('R2 test error:', error);
      setR2Status({ error: `Failed to fetch R2 status: ${error}` });
    }
    setLoading(prev => ({ ...prev, r2: false }));
  };

  const testFireflies = async () => {
    console.log('Testing Fireflies connection...');
    setLoading(prev => ({ ...prev, fireflies: true }));
    try {
      const response = await fetch('/api/test-r2', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fireflies response:', data);
      setFirefliesStatus(data);
    } catch (error) {
      console.error('Fireflies test error:', error);
      setFirefliesStatus({ error: `Failed to test Fireflies: ${error}` });
    }
    setLoading(prev => ({ ...prev, fireflies: false }));
  };

  const runSync = async () => {
    console.log('Running sync...');
    setLoading(prev => ({ ...prev, sync: true }));
    try {
      const response = await fetch('/api/sync-meetings', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Sync response:', data);
      setSyncResult(data);
      // Refresh R2 status after sync
      await testR2();
    } catch (error) {
      console.error('Sync error:', error);
      setSyncResult({ error: `Failed to run sync: ${error}` });
    }
    setLoading(prev => ({ ...prev, sync: false }));
  };

  const testUpload = async () => {
    console.log('Testing R2 upload...');
    setLoading(prev => ({ ...prev, upload: true }));
    try {
      const response = await fetch('/api/test-r2-upload', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Upload response:', data);
      setUploadResult(data);
      // Refresh R2 status after upload
      await testR2();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({ error: `Failed to test upload: ${error}` });
    }
    setLoading(prev => ({ ...prev, upload: false }));
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Test Fireflies Sync</h1>
      
      <div className="space-y-6">
        {/* R2 Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              R2 Bucket Status
              <Button 
                onClick={testR2} 
                disabled={loading.r2}
                variant="outline"
                size="sm"
              >
                {loading.r2 && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Check R2
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r2Status && (
              <div className="space-y-2">
                {r2Status.error ? (
                  <p className="text-red-500">{r2Status.error}</p>
                ) : (
                  <>
                    <p><strong>Bucket:</strong> {r2Status.bucketName}</p>
                    <p><strong>Total Meeting Files:</strong> {r2Status.totalFiles}</p>
                    <p><strong>Total Objects in Bucket:</strong> {r2Status.totalObjects || 0}</p>
                    {r2Status.mostRecentFile && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <p className="font-semibold">Most Recent File:</p>
                        <p><strong>Date:</strong> {r2Status.mostRecentFile.date}</p>
                        <p><strong>Title:</strong> {r2Status.mostRecentFile.title}</p>
                        <p><strong>Filename:</strong> {r2Status.mostRecentFile.filename}</p>
                      </div>
                    )}
                    {r2Status.files && r2Status.files.length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer font-semibold">All Files ({r2Status.files.length})</summary>
                        <div className="mt-2 space-y-1 text-sm">
                          {r2Status.files.map((file: any, i: number) => (
                            <div key={i} className="p-2 bg-gray-50 rounded">
                              {file.filename}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fireflies Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Fireflies Connection
              <Button 
                onClick={testFireflies} 
                disabled={loading.fireflies}
                variant="outline"
                size="sm"
              >
                {loading.fireflies && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Test Connection
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {firefliesStatus && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {firefliesStatus.firefliesConnected ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>
                    {firefliesStatus.firefliesConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                {firefliesStatus.user && (
                  <p><strong>User:</strong> {firefliesStatus.user.name} ({firefliesStatus.user.email})</p>
                )}
                {firefliesStatus.latestTranscript && (
                  <div className="mt-2 p-3 bg-gray-50 rounded">
                    <p className="font-semibold">Latest Transcript:</p>
                    <p><strong>Title:</strong> {firefliesStatus.latestTranscript.title}</p>
                    <p><strong>Date:</strong> {new Date(firefliesStatus.latestTranscript.date).toLocaleDateString()}</p>
                  </div>
                )}
                {firefliesStatus.error && (
                  <p className="text-red-500">{firefliesStatus.error}: {firefliesStatus.details}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Test R2 Upload
              <Button 
                onClick={testUpload} 
                disabled={loading.upload}
                variant="outline"
                size="sm"
              >
                {loading.upload && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Test Upload
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadResult && (
              <div className="space-y-2">
                {uploadResult.success ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Upload successful!</span>
                    </div>
                    <p><strong>File:</strong> {uploadResult.uploadedFile}</p>
                    <p><strong>Path:</strong> {uploadResult.uploadPath}</p>
                  </>
                ) : (
                  <div className="text-red-500">
                    <p>{uploadResult.error}</p>
                    <p className="text-sm">{uploadResult.details}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Sync Meetings
              <Button 
                onClick={runSync} 
                disabled={loading.sync}
                variant="default"
              >
                {loading.sync && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Run Sync
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {syncResult && (
              <div className="space-y-2">
                <p><strong>Status:</strong> {syncResult.message}</p>
                <p><strong>Synced:</strong> {syncResult.count}</p>
                <p><strong>Failed:</strong> {syncResult.failed}</p>
                {syncResult.uploadedFiles && syncResult.uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold">Uploaded Files:</p>
                    <div className="mt-2 space-y-1 text-sm">
                      {syncResult.uploadedFiles.map((file: any, i: number) => (
                        <div key={i} className="p-2 bg-green-50 rounded">
                          {file.filename}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold text-red-600">Errors:</p>
                    <div className="mt-2 space-y-1 text-sm">
                      {syncResult.errors.map((error: string, i: number) => (
                        <div key={i} className="p-2 bg-red-50 rounded text-red-700">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </AppLayout>
  );
}