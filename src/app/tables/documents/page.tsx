// app/documents/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Users, 
  Clock, 
  Search, 
  ExternalLink,
  Filter,
  Download,
  RefreshCw,
  Tag
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  filename: string;
  type: 'meeting-transcript' | 'business-document' | 'report' | 'memo';
  category: string;
  summary: string;
  date: string;
  duration?: string;
  participants?: string[];
  project: string;
  department: string;
  priority: 'low' | 'medium' | 'high';
  status: 'draft' | 'review' | 'completed' | 'archived';
  tags: string[];
  fileSize: string;
  lastModified: string;
  url: string;
}

// Mock data - replace with actual API call
const mockDocuments: Document[] = [
  {
    id: '1',
    title: 'Goodwill Bloomington Exterior Design Meeting',
    filename: '2025-07-08 - Goodwill Bloomington Exterior Design Meeting.md',
    type: 'meeting-transcript',
    category: 'Design Review',
    summary: 'Discussion of exterior design elements for the Bloomington location including color schemes, signage, and landscaping requirements.',
    date: '2025-07-08',
    duration: '10.5 minutes',
    participants: ['greulice@bloomington.in.gov', 'amulder@goodwillindy.org', 'jerome.daksiewicz@dkgrar.com'],
    project: 'goodwill-bloomington',
    department: 'operations',
    priority: 'high',
    status: 'completed',
    tags: ['meeting', 'design', 'exterior', 'bloomington'],
    fileSize: '15.2 KB',
    lastModified: '2025-07-08T14:30:00Z',
    url: 'https://r2-bucket.example.com/meetings/meeting-01JZGD41X5JE6S3QGEAED0527W.md'
  },
  {
    id: '2',
    title: 'Q3 Strategic Planning Session',
    filename: '2025-07-15 - Q3 Strategic Planning Session.md',
    type: 'meeting-transcript',
    category: 'Strategic Planning',
    summary: 'Quarterly review of business objectives, resource allocation, and key performance indicators for Q3 2025.',
    date: '2025-07-15',
    duration: '45 minutes',
    participants: ['john.doe@company.com', 'sarah.wilson@company.com', 'mike.chen@company.com'],
    project: 'strategic-planning',
    department: 'executive',
    priority: 'high',
    status: 'completed',
    tags: ['meeting', 'strategy', 'quarterly', 'planning'],
    fileSize: '28.7 KB',
    lastModified: '2025-07-15T16:45:00Z',
    url: 'https://r2-bucket.example.com/meetings/q3-strategic-planning.md'
  },
  {
    id: '3',
    title: 'Employee Handbook 2025',
    filename: 'Employee_Handbook_2025.pdf',
    type: 'business-document',
    category: 'HR Documentation',
    summary: 'Comprehensive employee handbook covering policies, procedures, benefits, and company culture guidelines.',
    date: '2025-01-01',
    project: 'hr-documentation',
    department: 'human-resources',
    priority: 'medium',
    status: 'completed',
    tags: ['handbook', 'policies', 'hr', 'documentation'],
    fileSize: '2.1 MB',
    lastModified: '2025-01-15T09:00:00Z',
    url: 'https://r2-bucket.example.com/documents/Employee_Handbook_2025.pdf'
  },
  {
    id: '4',
    title: 'Marketing Campaign Analysis',
    filename: 'Marketing_Campaign_Q2_2025_Analysis.xlsx',
    type: 'report',
    category: 'Marketing Analytics',
    summary: 'Detailed analysis of Q2 2025 marketing campaigns including ROI, conversion rates, and customer acquisition costs.',
    date: '2025-06-30',
    project: 'marketing-analytics',
    department: 'marketing',
    priority: 'medium',
    status: 'review',
    tags: ['marketing', 'analysis', 'roi', 'q2'],
    fileSize: '856 KB',
    lastModified: '2025-07-01T11:30:00Z',
    url: 'https://r2-bucket.example.com/reports/Marketing_Campaign_Q2_2025_Analysis.xlsx'
  },
  {
    id: '5',
    title: 'Security Protocol Update Memo',
    filename: 'Security_Protocol_Update_July_2025.docx',
    type: 'memo',
    category: 'Security',
    summary: 'Updated security protocols and procedures following recent cybersecurity assessment and compliance requirements.',
    date: '2025-07-10',
    project: 'security-updates',
    department: 'it-security',
    priority: 'high',
    status: 'completed',
    tags: ['security', 'protocols', 'memo', 'compliance'],
    fileSize: '245 KB',
    lastModified: '2025-07-10T14:15:00Z',
    url: 'https://r2-bucket.example.com/documents/Security_Protocol_Update_July_2025.docx'
  }
];

const typeColors = {
  'meeting-transcript': 'bg-blue-100 text-blue-800',
  'business-document': 'bg-green-100 text-green-800',
  'report': 'bg-purple-100 text-purple-800',
  'memo': 'bg-orange-100 text-orange-800'
};

const typeDisplayNames = {
  'meeting-transcript': 'Meeting',
  'business-document': 'Operations',
  'report': 'Report',
  'memo': 'Memo'
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isMounted, setIsMounted] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async (cursor?: string, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const url = cursor ? `/api/documents?cursor=${encodeURIComponent(cursor)}` : '/api/documents';
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        if (append) {
          setDocuments(prev => [...prev, ...(data.documents || [])]);
        } else {
          setDocuments(data.documents || []);
        }
        setNextCursor(data.nextCursor || null);
        setHasMore(data.hasMore || false);
      } else {
        console.error('Failed to load documents:', data.error);
        // Fall back to mock data for development
        if (!append) {
          setDocuments(mockDocuments);
          setHasMore(false);
          setNextCursor(null);
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      // Fall back to mock data for development
      if (!append) {
        setDocuments(mockDocuments);
        setHasMore(false);
        setNextCursor(null);
      }
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Filter documents based on search and filters
  useEffect(() => {
    let filtered = documents;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        doc.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(doc => doc.department === departmentFilter);
    }

    setFilteredDocuments(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [documents, searchTerm, typeFilter, departmentFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = filteredDocuments.slice(startIndex, endIndex);

  const refreshDocuments = async () => {
    await loadDocuments();
  };

  const formatDate = (dateString: string) => {
    // Use a consistent format to avoid hydration mismatch
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}, ${year}`;
  };

  const getUniqueValues = (key: keyof Document) => {
    return [...new Set(documents.map(doc => doc[key] as string))];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Library</h1>
          <p className="mt-2">
            Manage and explore your RAG knowledge base including meeting transcripts and business documents
          </p>
        </div>
        <Button 
          onClick={refreshDocuments} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents, summaries, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="meeting-transcript">Meetings</SelectItem>
                <SelectItem value="business-document">Operations</SelectItem>
                <SelectItem value="report">Reports</SelectItem>
                <SelectItem value="memo">Memos</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {getUniqueValues('department').map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept.charAt(0).toUpperCase() + dept.slice(1).replace('-', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Show:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>

      {/* Documents Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Documents ({filteredDocuments.length} loaded{hasMore ? '+' : ''})
            {filteredDocuments.length > itemsPerPage && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredDocuments.length)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Loading documents...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Document</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[300px]">Summary</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{doc.title}</p>
                          {(doc.duration || doc.participants) && (
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {doc.duration && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {doc.duration}
                                </div>
                              )}
                              {doc.participants && (
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {doc.participants.length} participants
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {doc.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {doc.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{doc.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {isMounted ? formatDate(doc.date) : doc.date}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeColors[doc.type]}>
                          {typeDisplayNames[doc.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{doc.category}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {doc.summary}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">
                          {doc.department.replace('-', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                window.open(doc.url, '_blank');
                              }
                            }}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              // Implement download functionality
                              if (typeof window !== 'undefined') {
                                const link = document.createElement('a');
                                link.href = doc.url;
                                link.download = doc.filename;
                                link.click();
                              }
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredDocuments.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents found matching your criteria.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Try adjusting your search terms or filters.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Load More Button */}
          {hasMore && !isLoading && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => loadDocuments(nextCursor || undefined, true)}
                disabled={isLoadingMore}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading More...
                  </>
                ) : (
                  <>
                    Load More Documents
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      +{itemsPerPage} more
                    </span>
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && !isLoading && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}