'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  ClipboardList,
  Activity,
  Target,
  Clock,
  BellRing,
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
interface ProjectListItem {
  id: string;
  name: string;
  client: string;
  status: 'Active' | 'Completed' | 'On Hold' | 'Cancelled';
  startDate: string;
  endDate?: string;
  completionPercentage?: number;
  projectedRevenue: number;
  projectedProfit: number;
  actualRevenue?: number;
  actualProfit?: number;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  teamCount: number;
  tags?: string[];
}

interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalRevenue: number;
  totalProfit: number;
  avgCompletionRate: number;
  atRiskProjects: number;
  upcomingDeadlines: number;
}

interface InsightItem {
  id: string;
  projectId: string;
  projectName?: string;
  kind: 'risk' | 'opportunity' | 'deadline' | 'milestone';
  title: string;
  body: string;
  confidence: number;
  createdAt?: string;
}

// Mock data for development
const MOCK_PROJECTS: ProjectListItem[] = [
  {
    id: 'p-001',
    name: 'Riverside Medical Center',
    client: 'HealthCo',
    status: 'Active',
    startDate: '2024-01-01',
    completionPercentage: 65,
    projectedRevenue: 2400000,
    projectedProfit: 380000,
    risk: 'Medium',
    teamCount: 5,
    tags: ['Healthcare', 'Renovation']
  },
  {
    id: 'p-002',
    name: 'Harborview Office Tower',
    client: 'Bay Capital',
    status: 'Active',
    startDate: '2024-02-15',
    completionPercentage: 30,
    projectedRevenue: 5100000,
    projectedProfit: 920000,
    risk: 'High',
    teamCount: 7,
    tags: ['Commercial', 'New Build']
  },
  {
    id: 'p-003',
    name: 'Sunset Elementary School',
    client: 'City School District',
    status: 'Completed',
    startDate: '2023-09-01',
    endDate: '2024-03-15',
    completionPercentage: 100,
    projectedRevenue: 1800000,
    projectedProfit: 280000,
    actualRevenue: 1850000,
    actualProfit: 310000,
    risk: 'Low',
    teamCount: 4,
    tags: ['Education', 'Public']
  }
];

const MOCK_INSIGHTS: InsightItem[] = [
  {
    id: 'i-001',
    projectId: 'p-002',
    projectName: 'Harborview Office Tower',
    kind: 'risk',
    title: 'HVAC Equipment Lead Time Risk',
    body: 'Critical HVAC components have 16-week lead time. Order by Friday to avoid 2-week delay.',
    confidence: 0.85,
    createdAt: new Date().toISOString()
  },
  {
    id: 'i-002',
    projectId: 'p-001',
    projectName: 'Riverside Medical Center',
    kind: 'opportunity',
    title: 'Early Completion Bonus Available',
    body: 'Client offering $50K bonus for completion 2 weeks ahead of schedule. Team capacity available.',
    confidence: 0.72,
    createdAt: new Date().toISOString()
  },
  {
    id: 'i-003',
    projectId: 'p-002',
    projectName: 'Harborview Office Tower',
    kind: 'deadline',
    title: 'Permit Renewal Required',
    body: 'Building permit expires in 10 days. Renewal application needed immediately.',
    confidence: 0.95,
    createdAt: new Date().toISOString()
  }
];

// Components
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, change, icon: Icon, trend }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {change}
            </p>
          )}
        </div>
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
    </CardContent>
  </Card>
);

const ProjectRow: React.FC<{ project: ProjectListItem; onClick: () => void }> = ({ project, onClick }) => (
  <div 
    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-2">
      <div>
        <h3 className="font-semibold">{project.name}</h3>
        <p className="text-sm text-gray-600">{project.client}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={project.status === 'Active' ? 'default' : 
                       project.status === 'Completed' ? 'secondary' : 
                       'outline'}>
          {project.status}
        </Badge>
        <Badge variant={project.risk === 'Critical' || project.risk === 'High' ? 'destructive' :
                       project.risk === 'Medium' ? 'secondary' : 
                       'outline'}>
          {project.risk} Risk
        </Badge>
      </div>
    </div>
    
    {project.completionPercentage !== undefined && (
      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{project.completionPercentage}%</span>
        </div>
        <Progress value={project.completionPercentage} className="h-2" />
      </div>
    )}
    
    <div className="flex justify-between text-sm">
      <div className="flex gap-4">
        <span className="text-gray-600">
          <Users className="inline h-4 w-4 mr-1" />
          {project.teamCount} team members
        </span>
        <span className="text-gray-600">
          <Calendar className="inline h-4 w-4 mr-1" />
          Started {new Date(project.startDate).toLocaleDateString()}
        </span>
      </div>
      <div className="flex gap-4">
        <span className="font-medium">
          Rev: ${(project.projectedRevenue / 1000000).toFixed(1)}M
        </span>
        <span className="text-green-600 font-medium">
          Profit: ${(project.projectedProfit / 1000).toFixed(0)}K
        </span>
      </div>
    </div>
  </div>
);

const InsightCard: React.FC<{ insight: InsightItem }> = ({ insight }) => {
  const getInsightIcon = () => {
    switch (insight.kind) {
      case 'risk': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'opportunity': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'deadline': return <Clock className="h-5 w-5 text-orange-500" />;
      case 'milestone': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default: return <BellRing className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-1">
            {getInsightIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-semibold text-sm">{insight.title}</h4>
              <Badge variant="outline" className="text-xs">
                {Math.round(insight.confidence * 100)}% conf
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{insight.body}</p>
            <p className="text-xs text-gray-500">
              {insight.projectName} • {insight.createdAt ? new Date(insight.createdAt).toLocaleDateString() : 'Today'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
export default function ProjectsDashboard() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [metrics, setMetrics] = useState<ProjectMetrics>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgCompletionRate: 0,
    atRiskProjects: 0,
    upcomingDeadlines: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // In production, this would fetch from your API
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      setProjects(MOCK_PROJECTS);
      setInsights(MOCK_INSIGHTS);
      
      // Calculate metrics
      const activeProjects = MOCK_PROJECTS.filter(p => p.status === 'Active');
      const completedProjects = MOCK_PROJECTS.filter(p => p.status === 'Completed');
      const totalRevenue = MOCK_PROJECTS.reduce((sum, p) => sum + (p.actualRevenue || p.projectedRevenue), 0);
      const totalProfit = MOCK_PROJECTS.reduce((sum, p) => sum + (p.actualProfit || p.projectedProfit), 0);
      const avgCompletion = activeProjects.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / activeProjects.length;
      const atRisk = MOCK_PROJECTS.filter(p => p.risk === 'High' || p.risk === 'Critical').length;
      
      setMetrics({
        totalProjects: MOCK_PROJECTS.length,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        totalRevenue,
        totalProfit,
        avgCompletionRate: Math.round(avgCompletion),
        atRiskProjects: atRisk,
        upcomingDeadlines: 3
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
    const matchesRisk = selectedRisk === 'all' || project.risk === selectedRisk;
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesRisk && matchesSearch;
  });

  const handleProjectClick = (projectId: string) => {
    // In production, this would navigate to project detail page
    console.log('Navigate to project:', projectId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading project data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Projects Dashboard</h1>
        <p className="text-gray-600">Monitor all projects, insights, and performance metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Active Projects"
          value={metrics.activeProjects}
          change={`${metrics.totalProjects} total`}
          icon={Activity}
          trend="neutral"
        />
        <MetricCard
          title="Total Revenue"
          value={`$${(metrics.totalRevenue / 1000000).toFixed(1)}M`}
          change="+12% from last quarter"
          icon={DollarSign}
          trend="up"
        />
        <MetricCard
          title="Avg Completion"
          value={`${metrics.avgCompletionRate}%`}
          change="On track"
          icon={Target}
          trend="up"
        />
        <MetricCard
          title="At Risk"
          value={metrics.atRiskProjects}
          change={metrics.atRiskProjects > 0 ? "Needs attention" : "All clear"}
          icon={AlertTriangle}
          trend={metrics.atRiskProjects > 0 ? "down" : "neutral"}
        />
      </div>

      {/* AI Insights Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">AI Insights & Alerts</h2>
          <Badge variant="secondary">
            {insights.length} new insights
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">All Projects</h2>
          <div className="flex gap-2">
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="On Hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedRisk} onValueChange={setSelectedRisk}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="Low">Low Risk</SelectItem>
              <SelectItem value="Medium">Medium Risk</SelectItem>
              <SelectItem value="High">High Risk</SelectItem>
              <SelectItem value="Critical">Critical Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects Grid */}
        <div className="space-y-4">
          {filteredProjects.length > 0 ? (
            filteredProjects.map(project => (
              <ProjectRow 
                key={project.id} 
                project={project} 
                onClick={() => handleProjectClick(project.id)}
              />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">No projects found matching your filters</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}