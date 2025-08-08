"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, MessageSquare, BarChart3, Calendar, Users, Clock, Target } from 'lucide-react';
import { format } from 'date-fns';
import { SyncMeetingsButton } from '@/components/meetings/sync-meetings-button';

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: string;
  category?: string;
  priority?: string;
  summary?: string;
  action_items?: string[];
  decisions?: string[];
}

interface SearchResult {
  meetings: Meeting[];
  summary: string;
}

interface Analytics {
  totalMeetings: number;
  totalDuration: number;
  avgDuration: number;
  categoryCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  participantStats: {
    mostActive: string[];
    meetingsByParticipant: Record<string, number>;
  };
  recentTrends: {
    weeklyMeetings: number;
    monthlyMeetings: number;
  };
}

export default function MeetingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Fetch recent meetings on load
  useEffect(() => {
    fetchRecentMeetings();
    fetchAnalytics();
  }, []);

  const fetchRecentMeetings = async () => {
    try {
      const response = await fetch('/api/documents?limit=10&type=meeting');
      if (response.ok) {
        const data = await response.json();
        setRecentMeetings(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching recent meetings:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/documents/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: searchQuery,
          context: 'meetings_search'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults({
          meetings: data.relatedDocuments || [],
          summary: data.response || 'No results found.'
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
      critical: 'destructive'
    };
    return colors[priority?.toLowerCase()] || 'default';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      planning: Target,
      standup: Users,
      review: BarChart3,
      default: MessageSquare
    };
    const Icon = icons[category?.toLowerCase()] || icons.default;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meeting Intelligence</h1>
          <p className="text-muted-foreground">
            Search meeting transcripts, track decisions, and analyze meeting patterns
          </p>
        </div>
        <SyncMeetingsButton />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Search Meetings</TabsTrigger>
          <TabsTrigger value="recent">Recent Meetings</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <Card className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search meetings by topic, participant, or decision..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {searchResults && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Search Results</h3>
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <p className="text-sm">{searchResults.summary}</p>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {searchResults.meetings.map((meeting) => (
                    <Card
                      key={meeting.id}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedMeeting(meeting)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{meeting.title}</h4>
                        <Badge variant={getPriorityColor(meeting.priority)}>
                          {meeting.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(meeting.date), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {meeting.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          {getCategoryIcon(meeting.category)}
                          {meeting.category}
                        </span>
                      </div>
                      {meeting.summary && (
                        <p className="text-sm mt-2 line-clamp-2">{meeting.summary}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Meetings</h3>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {recentMeetings.map((meeting) => (
                  <Card
                    key={meeting.id}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedMeeting(meeting)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{meeting.title}</h4>
                      <div className="flex gap-2">
                        {meeting.category && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getCategoryIcon(meeting.category)}
                            {meeting.category}
                          </Badge>
                        )}
                        {meeting.priority && (
                          <Badge variant={getPriorityColor(meeting.priority)}>
                            {meeting.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(meeting.date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {meeting.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {meeting.participants?.split(',').length || 0} participants
                      </span>
                    </div>
                    {meeting.summary && (
                      <p className="text-sm line-clamp-2">{meeting.summary}</p>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Meetings</p>
                      <p className="text-2xl font-bold">{analytics.totalMeetings}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Duration</p>
                      <p className="text-2xl font-bold">{Math.round(analytics.totalDuration / 60)}h</p>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Duration</p>
                      <p className="text-2xl font-bold">{Math.round(analytics.avgDuration)}m</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">This Week</p>
                      <p className="text-2xl font-bold">{analytics.recentTrends.weeklyMeetings}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Meeting Categories</h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.categoryCounts).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category)}
                          <span className="capitalize">{category}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Most Active Participants</h3>
                  <div className="space-y-3">
                    {analytics.participantStats.mostActive.slice(0, 5).map((participant) => (
                      <div key={participant} className="flex items-center justify-between">
                        <span className="truncate">{participant}</span>
                        <Badge variant="secondary">
                          {analytics.participantStats.meetingsByParticipant[participant]} meetings
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <Card className="fixed bottom-0 right-0 m-6 p-6 w-96 max-h-[600px] overflow-auto shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">{selectedMeeting.title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMeeting(null)}
            >
              ×
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge variant={getPriorityColor(selectedMeeting.priority)}>
                {selectedMeeting.priority}
              </Badge>
              {selectedMeeting.category && (
                <Badge variant="outline">
                  {selectedMeeting.category}
                </Badge>
              )}
            </div>

            <div className="text-sm space-y-2">
              <p><strong>Date:</strong> {format(new Date(selectedMeeting.date), 'MMMM d, yyyy')}</p>
              <p><strong>Duration:</strong> {selectedMeeting.duration} minutes</p>
              <p><strong>Participants:</strong> {selectedMeeting.participants}</p>
            </div>

            {selectedMeeting.summary && (
              <div>
                <p className="font-medium mb-1">Summary</p>
                <p className="text-sm text-muted-foreground">{selectedMeeting.summary}</p>
              </div>
            )}

            {selectedMeeting.action_items && selectedMeeting.action_items.length > 0 && (
              <div>
                <p className="font-medium mb-1">Action Items</p>
                <ul className="text-sm space-y-1">
                  {selectedMeeting.action_items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 && (
              <div>
                <p className="font-medium mb-1">Key Decisions</p>
                <ul className="text-sm space-y-1">
                  {selectedMeeting.decisions.map((decision, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}