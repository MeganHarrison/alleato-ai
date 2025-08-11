'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, Calendar, FileText, Download, Clock, Upload } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';

interface MeetingFile {
  filename: string;
  path: string;
  size: number;
  uploaded: string;
  date: string;
  title: string;
}

export default function MeetingsListPage() {
  const [meetings, setMeetings] = useState<MeetingFile[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalObjects, setTotalObjects] = useState(0);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/meetings');
      const data = await response.json();
      
      if (data.files) {
        setMeetings(data.files);
        setFilteredMeetings(data.files);
        setTotalObjects(data.totalObjects);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
    setLoading(false);
  };

  const syncFireflies = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/sync-meetings', { method: 'POST' });
      const data = await response.json();
      setSyncResult(data);
      
      // If sync was successful, refresh the meetings list
      if (data.count > 0) {
        await fetchMeetings();
      }
    } catch (error) {
      console.error('Error syncing meetings:', error);
      setSyncResult({ error: 'Failed to sync meetings' });
    }
    setSyncing(false);
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    const filtered = meetings.filter(meeting => 
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.date.includes(searchTerm)
    );
    setFilteredMeetings(filtered);
  }, [searchTerm, meetings]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Group meetings by month
  const groupedMeetings = filteredMeetings.reduce((acc, meeting) => {
    const monthYear = new Date(meeting.date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(meeting);
    return acc;
  }, {} as Record<string, MeetingFile[]>);

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">All Meeting Transcripts</h1>
          <p className="text-gray-600">
            {meetings.length} meeting transcripts • {totalObjects} total files in storage
          </p>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by title or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={syncFireflies} disabled={syncing} variant="default">
            <Upload className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Fireflies'}
          </Button>
          <Button onClick={fetchMeetings} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {syncResult && (
          <div className={`mb-4 p-3 rounded-md text-sm ${
            syncResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {syncResult.error ? (
              <p>{syncResult.error}</p>
            ) : (
              <p>
                {syncResult.message} 
                {syncResult.uploadedFiles && syncResult.uploadedFiles.length > 0 && (
                  <span className="font-medium"> New meetings synced.</span>
                )}
              </p>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading meetings...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedMeetings).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No meetings found</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedMeetings).map(([monthYear, monthMeetings]) => (
                <div key={monthYear}>
                  <h2 className="text-lg font-semibold mb-2 text-gray-600">{monthYear}</h2>
                  <div className="space-y-0.5 mb-4">
                    {monthMeetings.map((meeting, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors group"
                      >
                        <div className="text-sm text-gray-500 w-20 flex-shrink-0">
                          {meeting.date}
                        </div>
                        <div className="flex-1 text-sm font-medium truncate">
                          {meeting.title}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/api/meetings/download?file=${encodeURIComponent(meeting.path)}`, '_blank')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}