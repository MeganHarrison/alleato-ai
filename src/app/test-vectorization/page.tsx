"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Database,
  Link,
  Building,
  Briefcase
} from "lucide-react";

interface VectorizationStatus {
  meeting_id: string;
  title: string;
  date: string;
  project_id?: string;
  project_name?: string;
  client_id?: string;
  client_name?: string;
  vector_processed: boolean;
  chunk_count: number;
  r2_key: string;
}

export default function TestVectorizationPage() {
  const [meetings, setMeetings] = useState<VectorizationStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchMeetingStatus();
  }, []);

  const fetchMeetingStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vectorization/status');
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Error fetching status:', error);
      setMessage({ type: 'error', text: 'Failed to fetch vectorization status' });
    } finally {
      setLoading(false);
    }
  };

  const triggerVectorization = async (meetingId: string) => {
    try {
      setProcessing(meetingId);
      setMessage(null);
      
      const response = await fetch('/api/vectorization/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Successfully vectorized meeting with ${result.chunks} chunks` 
        });
        fetchMeetingStatus(); // Refresh the list
      } else {
        throw new Error(result.error || 'Vectorization failed');
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to vectorize meeting' 
      });
    } finally {
      setProcessing(null);
    }
  };

  const processAllPending = async () => {
    const pendingMeetings = meetings.filter(m => !m.vector_processed);
    setMessage({ 
      type: 'success', 
      text: `Processing ${pendingMeetings.length} meetings...` 
    });

    for (const meeting of pendingMeetings) {
      await triggerVectorization(meeting.meeting_id);
      // Add delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const testProjectMatching = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await fetch('/api/vectorization/test-matching', {
        method: 'POST'
      });

      const result = await response.json();
      
      setMessage({ 
        type: 'success', 
        text: `Matched ${result.matched} out of ${result.total} meetings with projects/clients` 
      });
      
      fetchMeetingStatus();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to test project matching' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Vectorization Testing</h1>
          <p className="text-muted-foreground">
            Test and monitor the meeting vectorization process with project/client matching
          </p>
        </div>

        {message && (
          <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <Button 
            onClick={fetchMeetingStatus} 
            disabled={loading}
            variant="outline"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh Status
          </Button>
          
          <Button 
            onClick={processAllPending}
            disabled={loading || meetings.filter(m => !m.vector_processed).length === 0}
          >
            <Brain className="mr-2 h-4 w-4" />
            Process All Pending ({meetings.filter(m => !m.vector_processed).length})
          </Button>

          <Button 
            onClick={testProjectMatching}
            disabled={loading}
            variant="secondary"
          >
            <Link className="mr-2 h-4 w-4" />
            Test Project Matching
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{meetings.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Vectorized</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {meetings.filter(m => m.vector_processed).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Project Matched</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {meetings.filter(m => m.project_id).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Client Matched</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {meetings.filter(m => m.client_id).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meeting List */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Vectorization Status</CardTitle>
            <CardDescription>
              Shows vectorization status and project/client relationships
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loading && meetings.length === 0 ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading meetings...</p>
                </div>
              ) : meetings.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No meetings found</p>
                </div>
              ) : (
                meetings.map((meeting) => (
                  <div 
                    key={meeting.meeting_id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{meeting.title}</h3>
                        {meeting.vector_processed ? (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Vectorized ({meeting.chunk_count} chunks)
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{meeting.date}</span>
                        
                        {meeting.project_name && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            <span>{meeting.project_name}</span>
                          </div>
                        )}
                        
                        {meeting.client_name && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span>{meeting.client_name}</span>
                          </div>
                        )}
                        
                        {!meeting.project_name && !meeting.client_name && (
                          <span className="text-amber-600">No project/client matched</span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        {meeting.r2_key}
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => triggerVectorization(meeting.meeting_id)}
                      disabled={processing === meeting.meeting_id || meeting.vector_processed}
                      size="sm"
                    >
                      {processing === meeting.meeting_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Brain className="mr-2 h-4 w-4" />
                          {meeting.vector_processed ? 'Re-process' : 'Vectorize'}
                        </>
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}