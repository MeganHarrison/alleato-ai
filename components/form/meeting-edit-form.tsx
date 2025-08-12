import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Building, Briefcase, AlertCircle } from 'lucide-react';

// Types
interface Project {
  id: string;
  title: string;
  job_number?: string;
  client_name?: string;
  display_name?: string;
  status: string;
  priority: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  project_id?: string;
  client_id?: string;
  meeting_type: string;
  category: string;
  status: string;
  priority: string;
  participants?: string[];
  tags?: string[];
  summary?: string;
  notes?: string;
}

interface MeetingEditFormProps {
  meeting: Meeting;
  onClose: () => void;
  onSave: (meeting: Meeting) => Promise<void>;
}

// Meeting type options
const MEETING_TYPES = [
  { value: 'client_meeting', label: 'Client Meeting' },
  { value: 'project_review', label: 'Project Review' },
  { value: 'design_review', label: 'Design Review' },
  { value: 'team_standup', label: 'Team Standup' },
  { value: 'stakeholder_update', label: 'Stakeholder Update' },
  { value: 'budget_review', label: 'Budget Review' },
  { value: 'safety_briefing', label: 'Safety Briefing' },
  { value: 'site_inspection', label: 'Site Inspection' },
  { value: 'vendor_meeting', label: 'Vendor Meeting' },
  { value: 'planning_session', label: 'Planning Session' },
  { value: 'executive_review', label: 'Executive Review' },
  { value: 'training_session', label: 'Training Session' },
  { value: 'other', label: 'Other' }
];

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'project', label: 'Project' },
  { value: 'client', label: 'Client' },
  { value: 'internal', label: 'Internal' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' }
];

const STATUSES = [
  { value: 'pending', label: 'Pending Vectorization', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  { value: 'vectorized', label: 'Vectorized', color: 'bg-green-100 text-green-800' },
  { value: 'error', label: 'Error', color: 'bg-red-100 text-red-800' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-100 text-gray-800' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' }
];

export default function MeetingEditForm({ meeting, onClose, onSave }: MeetingEditFormProps) {
  const [formData, setFormData] = useState<Meeting>(meeting);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingProjects, setSyncingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load projects from API
  const loadProjects = async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      // This would be your actual API endpoint
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to load projects');
      
      const data = await response.json();
      
      // Format projects for display
      const formattedProjects = data.projects.map((p: Project) => ({
        ...p,
        display_name: p.job_number && p.job_number !== p.id 
          ? `${p.job_number} - ${p.title}`
          : p.title
      }));
      
      setProjects(formattedProjects);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects. Please try again.');
      
      // Fallback to mock data for demo
      setProjects([
        { id: 'proj-1', title: 'Goodwill Bloomington', job_number: 'GW-2024-001', client_name: 'Goodwill Industries', status: 'active', priority: 'high' },
        { id: 'proj-2', title: 'City Hall Renovation', job_number: 'CH-2024-002', client_name: 'City of Bloomington', status: 'active', priority: 'medium' },
        { id: 'proj-3', title: 'School District Office', job_number: 'SD-2024-003', client_name: 'School District', status: 'planning', priority: 'high' },
        { id: 'proj-4', title: 'Library Expansion', job_number: 'LB-2024-004', client_name: 'Public Library', status: 'active', priority: 'medium' },
        { id: 'proj-5', title: 'Medical Center Wing B', job_number: 'MC-2024-005', client_name: 'Regional Medical Center', status: 'active', priority: 'critical' }
      ].map(p => ({
        ...p,
        display_name: `${p.job_number} - ${p.title}`
      })));
    } finally {
      setLoadingProjects(false);
    }
  };

  // Sync projects from Notion
  const syncProjectsFromNotion = async () => {
    setSyncingProjects(true);
    setError(null);
    try {
      // This would trigger the Notion sync
      const response = await fetch('/api/sync-projects', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to sync projects');
      
      const result = await response.json();
      
      // Reload projects after sync
      await loadProjects();
      
      // Show success message
      setError(null);
      console.log('Sync completed:', result);
    } catch (err) {
      console.error('Error syncing projects:', err);
      setError('Failed to sync projects from Notion.');
    } finally {
      setSyncingProjects(false);
    }
  };

  // Filter projects based on search
  const filteredProjects = projects.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.job_number?.toLowerCase().includes(term) ||
      p.client_name?.toLowerCase().includes(term)
    );
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving meeting:', err);
      setError('Failed to save meeting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle reprocess for vectorization
  const handleReprocess = async () => {
    setSaving(true);
    try {
      await onSave({ ...formData, status: 'pending' });
      onClose();
    } catch (err) {
      console.error('Error reprocessing meeting:', err);
      setError('Failed to reprocess meeting.');
    } finally {
      setSaving(false);
    }
  };

  const selectedProject = projects.find(p => p.id === formData.project_id);
  const currentStatus = STATUSES.find(s => s.value === formData.status);
  const currentPriority = PRIORITIES.find(p => p.value === formData.priority);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Meeting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Meeting Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Project Association */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Project Association
              </label>
              <button
                type="button"
                onClick={syncProjectsFromNotion}
                disabled={syncingProjects}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${syncingProjects ? 'animate-spin' : ''}`} />
                Sync from Notion
              </button>
            </div>
            
            {/* Project search */}
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Project dropdown */}
            <select
              value={formData.project_id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  project_id: e.target.value,
                  client_id: project?.client_name || formData.client_id
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingProjects}
            >
              <option value="">No project assigned</option>
              {filteredProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.display_name || project.title}
                  {project.client_name && ` (${project.client_name})`}
                </option>
              ))}
            </select>
            
            {selectedProject && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md text-sm">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{selectedProject.job_number}</span>
                </div>
                {selectedProject.client_name && (
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="h-4 w-4 text-blue-600" />
                    <span>{selectedProject.client_name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Meeting Type and Category */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Type
              </label>
              <select
                value={formData.meeting_type}
                onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MEETING_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              {currentStatus && (
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${currentStatus.color}`}>
                    {currentStatus.label}
                  </span>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
              {currentPriority && (
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${currentPriority.color}`}>
                    {currentPriority.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Reprocess option for failed vectorization */}
          {(formData.status === 'error' || formData.status === 'pending') && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <button
                type="button"
                onClick={handleReprocess}
                className="text-sm text-yellow-700 hover:text-yellow-800 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reprocess for vectorization
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}