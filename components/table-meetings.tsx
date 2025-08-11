"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Users,
  FileText,
  RefreshCw,
  ExternalLink,
  Loader2,
  CloudDownload,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Meeting {
  id: string;
  fireflies_id: string;
  title: string;
  date_time: string;
  duration: number;
  organizer_email: string;
  attendees: string | string[];
  meeting_url: string | null;
  category: string | null;
  project: string | null;
  department: string | null;
  transcript_downloaded: boolean;
  vector_processed: boolean;
  processed_at: string | null;
  r2_key: string | null;
  transcript_preview: string | null;
  created_at: string;
  updated_at: string;
}

export function MeetingsTable() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchMeetings = async () => {
    try {
      const response = await fetch("/api/meetings");
      if (!response.ok) {
        throw new Error("Failed to fetch meetings");
      }
      const data = await response.json();
      setMeetings(data.meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMeetings();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/sync-meetings-to-d1", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Sync failed");
      }
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Synced ${data.count} meetings from Fireflies`);
        if (data.skipped > 0) {
          toast.info(`${data.skipped} meetings already existed`);
        }
      } else {
        throw new Error(data.error || "Sync failed");
      }
      
      // Refresh the table
      await fetchMeetings();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync meetings from Fireflies");
    } finally {
      setSyncing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const parseAttendees = (attendees: string | string[]): string[] => {
    if (Array.isArray(attendees)) return attendees;
    try {
      return JSON.parse(attendees);
    } catch {
      return [];
    }
  };

  const getStatusBadge = (downloaded: boolean, processed: boolean) => {
    if (processed) {
      return <Badge className="bg-green-500">Processed</Badge>;
    } else if (downloaded) {
      return <Badge className="bg-yellow-500">Downloaded</Badge>;
    } else {
      return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meetings</h2>
          <p className="text-muted-foreground">
            Meeting transcripts from Fireflies.ai stored in D1 database
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={syncing || refreshing}
            variant="default"
            size="sm"
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <CloudDownload className="mr-2 h-4 w-4" />
                Sync from Fireflies
              </>
            )}
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={refreshing || syncing}
            variant="outline"
            size="sm"
          >
            {refreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Attendees</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No meetings found
                </TableCell>
              </TableRow>
            ) : (
              meetings.map((meeting) => (
                <TableRow key={meeting.id}>
                  <TableCell className="font-medium">
                    <div className="max-w-sm">
                      <p className="truncate">{meeting.title}</p>
                      {meeting.transcript_preview && (
                        <p className="text-sm text-muted-foreground truncate">
                          {meeting.transcript_preview}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(meeting.date_time).toLocaleDateString()}
                      <Clock className="h-4 w-4 ml-2" />
                      {new Date(meeting.date_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(meeting.duration)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {parseAttendees(meeting.attendees).length}
                    </div>
                  </TableCell>
                  <TableCell>
                    {meeting.project ? (
                      <Badge variant="outline">{meeting.project}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(
                      meeting.transcript_downloaded,
                      meeting.vector_processed
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {meeting.meeting_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(meeting.meeting_url!, "_blank")
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      {meeting.r2_key && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `https://app.fireflies.ai/view/${meeting.fireflies_id}`,
                              "_blank"
                            )
                          }
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Showing {meetings.length} meeting{meetings.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}