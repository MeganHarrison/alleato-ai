'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Calendar, DollarSign, TrendingUp, Users, Building, 
  MessageSquare, FileText, AlertTriangle, Clock, CheckCircle,
  Send, Loader2, RefreshCw, Download, Share2, Edit, Sparkles
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface ProjectDetail {
  id: string;
  title: string;
  client_name: string;
  client_id?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_value: number;
  actual_cost?: number;
  profit_margin: number;
  start_date: string;
  estimated_completion: string;
  actual_completion?: string;
  project_address?: string;
  description?: string;
  
  // Team members
  project_manager?: { id: string; name: string; email: string; };
  superintendent?: { id: string; name: string; email: string; };
  estimator?: { id: string; name: string; email: string; };
  owner?: { id: string; name: string; email: string; };
  
  // AI Insights
  health_score?: number;
  ai_summary?: string;
  risk_analysis?: Array<{ title: string; severity: string; mitigation: string; }>;
  opportunities?: Array<{ title: string; impact: string; action: string; }>;
  
  // Related data counts
  meeting_count?: number;
  document_count?: number;
  note_count?: number;
  change_order_count?: number;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  summary?: string;
  action_items?: string[];
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
  uploaded_by?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Tab data states
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      const data = await response.json();
      setProject(data.project);
      
      // Fetch related data
      fetchMeetings();
      fetchDocuments();
    } catch (error) {
      console.error('Error fetching project:', error);
      // Use mock data for development
      setProject({
        id: projectId,
        title: 'Riverside Medical Center Expansion',
        client_name: 'HealthCo Industries',
        status: 'active',
        priority: 'high',
        estimated_value: 2400000,
        profit_margin: 0.158,
        start_date: '2024-01-15',
        estimated_completion: '2024-12-31',
        project_address: '123 Medical Drive, San Francisco, CA 94102',
        description: 'Major expansion of the east wing including new emergency department and surgical suites.',
        
        project_manager: { id: 'pm1', name: 'John Smith', email: 'john@company.com' },
        superintendent: { id: 'sp1', name: 'Mike Johnson', email: 'mike@company.com' },
        estimator: { id: 'es1', name: 'Sarah Williams', email: 'sarah@company.com' },
        owner: { id: 'ow1', name: 'David Brown', email: 'david@company.com' },
        
        health_score: 78,
        ai_summary: 'Project is progressing well with minor schedule risks. Recent meetings indicate strong client satisfaction. Recommend accelerating equipment procurement to avoid potential delays.',
        
        risk_analysis: [
          { title: 'Equipment Lead Time', severity: 'high', mitigation: 'Order HVAC units by end of week' },
          { title: 'Weather Delays', severity: 'medium', mitigation: 'Build 2-week buffer into schedule' },
          { title: 'Permit Approval', severity: 'low', mitigation: 'Submit final drawings by Friday' }
        ],
        
        opportunities: [
          { title: 'Early Completion Bonus', impact: 'high', action: 'Increase crew size for critical path items' },
          { title: 'Additional Phase 2 Work', impact: 'medium', action: 'Present proposal at next client meeting' }
        ],
        
        meeting_count: 24,
        document_count: 156,
        note_count: 89,
        change_order_count: 3
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/meetings`);
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      // Mock data
      setMeetings([
        {
          id: 'm1',
          title: 'Weekly Progress Review',
          date: '2024-03-15T10:00:00',
          participants: ['John Smith', 'Mike Johnson', 'Client Rep'],
          summary: 'Discussed foundation completion and upcoming milestones.',
          action_items: ['Order steel beams', 'Schedule inspection', 'Update timeline']
        },
        {
          id: 'm2',
          title: 'Safety Walkthrough',
          date: '2024-03-12T14:00:00',
          participants: ['Mike Johnson', 'Safety Inspector'],
          summary: 'Completed monthly safety inspection. No violations found.'
        }
      ]);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Mock data
      setDocuments([
        { id: 'd1', name: 'Architectural Plans v3.pdf', type: 'pdf', size: 15728640, uploaded_at: '2024-03-10', uploaded_by: 'Sarah Williams' },
        { id: 'd2', name: 'Budget Spreadsheet.xlsx', type: 'excel', size: 524288, uploaded_at: '2024-03-08', uploaded_by: 'John Smith' },
        { id: 'd3', name: 'Site Photos - March.zip', type: 'zip', size: 104857600, uploaded_at: '2024-03-14', uploaded_by: 'Mike Johnson' }
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          context: `Project: ${project?.title}`,
          projectId: projectId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Mock response
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: `Based on the project data, ${project?.title} is currently ${project?.health_score}% healthy. The main risk is equipment lead time, which should be addressed by ordering HVAC units this week. Would you like more specific information about any aspect of the project?`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-6 px-4">
        <p>Project not found</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      'on-hold': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/projects-dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {project.client_name}
              </span>
              {project.project_address && (
                <span>{project.project_address}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            <Badge variant="outline">
              {project.priority} priority
            </Badge>
            <Button variant="outline" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Start Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {format(new Date(project.start_date), 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Est. Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {format(new Date(project.estimated_completion), 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Est. Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              ${(project.estimated_value / 1000000).toFixed(2)}M
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Est. Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-green-600">
              ${((project.estimated_value * project.profit_margin) / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-gray-500">
              {(project.profit_margin * 100).toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${getHealthColor(project.health_score || 0)}`}>
              {project.health_score || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {project.owner && (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{project.owner.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{project.owner.name}</p>
                  <p className="text-xs text-gray-500">Owner</p>
                </div>
              </div>
            )}
            {project.project_manager && (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{project.project_manager.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{project.project_manager.name}</p>
                  <p className="text-xs text-gray-500">Project Manager</p>
                </div>
              </div>
            )}
            {project.estimator && (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{project.estimator.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{project.estimator.name}</p>
                  <p className="text-xs text-gray-500">Estimator</p>
                </div>
              </div>
            )}
            {project.superintendent && (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{project.superintendent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{project.superintendent.name}</p>
                  <p className="text-xs text-gray-500">Superintendent</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      {project.ai_summary && (
        <Card className="mb-6 border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Executive Summary</h4>
              <p className="text-sm text-gray-700">{project.ai_summary}</p>
            </div>
            
            {project.risk_analysis && project.risk_analysis.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Risk Analysis</h4>
                <div className="space-y-2">
                  {project.risk_analysis.map((risk, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                        risk.severity === 'high' ? 'text-red-500' :
                        risk.severity === 'medium' ? 'text-yellow-500' :
                        'text-gray-500'
                      }`} />
                      <div>
                        <p className="font-medium">{risk.title}</p>
                        <p className="text-gray-600">Mitigation: {risk.mitigation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {project.opportunities && project.opportunities.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Opportunities</h4>
                <div className="space-y-2">
                  {project.opportunities.map((opp, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 mt-0.5 text-green-500" />
                      <div>
                        <p className="font-medium">{opp.title}</p>
                        <p className="text-gray-600">Action: {opp.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="meetings">
            Meetings {project.meeting_count ? `(${project.meeting_count})` : ''}
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes {project.note_count ? `(${project.note_count})` : ''}
          </TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="files">
            Files {project.document_count ? `(${project.document_count})` : ''}
          </TabsTrigger>
          <TabsTrigger value="changes">
            Changes {project.change_order_count ? `(${project.change_order_count})` : ''}
          </TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{project.description}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="mt-4">
          <div className="space-y-4">
            {meetings.map(meeting => (
              <Card key={meeting.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      <CardDescription>
                        {format(new Date(meeting.date), 'PPp')} • {meeting.participants.join(', ')}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Transcript
                    </Button>
                  </div>
                </CardHeader>
                {meeting.summary && (
                  <CardContent>
                    <p className="text-sm text-gray-700 mb-3">{meeting.summary}</p>
                    {meeting.action_items && meeting.action_items.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Action Items:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {meeting.action_items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <div className="space-y-2">
            {documents.map(doc => (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {(doc.size / 1048576).toFixed(2)} MB • Uploaded {doc.uploaded_at} by {doc.uploaded_by}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Add other tab contents as needed */}
      </Tabs>

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Project Assistant
          </CardTitle>
          <CardDescription>
            Ask questions about this project, get insights, and receive recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] mb-4 p-4 border rounded-lg">
            {chatMessages.length === 0 ? (
              <p className="text-center text-gray-500 text-sm">
                Start a conversation about {project.title}
              </p>
            ) : (
              <div className="space-y-4">
                {chatMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          <div className="flex gap-2">
            <Input
              placeholder="Ask about project status, risks, or recommendations..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={chatLoading}
            />
            <Button onClick={handleSendMessage} disabled={chatLoading || !chatInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}