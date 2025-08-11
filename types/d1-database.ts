/**
 * Auto-generated TypeScript types for Alleato D1 Database
 * Generated on: 2025-08-08T09:41:33.031Z
 * 
 * DO NOT EDIT MANUALLY - This file is auto-generated
 * Run 'npm run generate-types' to regenerate
 */

export namespace Database {
  /**
   * Database Tables
   */

  export interface Meetings {
    title: string;
    date?: string;
    date_time?: string;
    duration?: number;
    project_id?: string;
    client_id?: string;
    participants?: Participant[];
    attendees?: Participant[];
    organizer_email?: string;
    summary?: string;
    action_items?: ActionItem[];
    decisions?: Decision[];
    keywords?: string[];
    tags?: string[];
    category?: string;
    priority?: string;
    department?: string;
    fireflies_id?: string;
    transcript_downloaded?: boolean;
    vector_processed?: boolean;
    r2_key?: string;
    searchable_text?: string;
    word_count?: number;
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface MeetingChunks {
    meeting_id: string;
    chunk_index: number;
    chunk_type?: string;
    content: string;
    speaker?: string;
    start_time?: number;
    end_time?: number;
    embedding?: ArrayBuffer;
    embedding_model?: string;
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface VectorIndex {
    chunk_id: string;
    meeting_id: string;
    meeting_title?: string;
    meeting_date?: string;
    chunk_preview?: string;
    relevance_score?: number;
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface Projects {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    client_id?: string;
    project_manager_id?: string;
    superintendent_id?: string;
    estimator_id?: string;
    estimated_value?: number;
    actual_cost?: number;
    budget?: number;
    profit_margin?: number;
    start_date?: string;
    estimated_completion?: string;
    actual_completion?: string;
    autorag_project_tag?: string;
    document_count?: number;
    last_meeting_date?: string;
    notion_id?: string;
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface Clients {
    company_name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    client_type?: string;
    credit_rating?: string;
    total_project_value?: number;
    active_projects_count?: number;
    notion_id?: string;
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface Employees {
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface DocumentMetadata {
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface Tasks {
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface Subcontractors {
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface ProjectSubcontractors {
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface Interactions {
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface SearchQueries {
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface ProjectInsights {
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface WebhookEvents {
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface ProcessingQueue {
    id: string;
    created_at: string;
    updated_at: string;
  }

  export interface SystemMetadata {
    id: string;
    created_at: string;
    updated_at: string;
  }

  /**
   * Insert Types (Omit auto-generated fields)
   */
  export type MeetingsInsert = Omit<Meetings, 'id' | 'created_at' | 'updated_at'>;
  export type MeetingChunksInsert = Omit<MeetingChunks, 'id' | 'created_at' | 'updated_at'>;
  export type VectorIndexInsert = Omit<VectorIndex, 'id' | 'created_at' | 'updated_at'>;
  export type ProjectsInsert = Omit<Projects, 'id' | 'created_at' | 'updated_at'>;
  export type ClientsInsert = Omit<Clients, 'id' | 'created_at' | 'updated_at'>;
  export type EmployeesInsert = Omit<Employees, 'id' | 'created_at' | 'updated_at'>;
  export type DocumentMetadataInsert = Omit<DocumentMetadata, 'id' | 'created_at' | 'updated_at'>;
  export type TasksInsert = Omit<Tasks, 'id' | 'created_at' | 'updated_at'>;
  export type SubcontractorsInsert = Omit<Subcontractors, 'id' | 'created_at' | 'updated_at'>;
  export type ProjectSubcontractorsInsert = Omit<ProjectSubcontractors, 'id' | 'created_at' | 'updated_at'>;
  export type InteractionsInsert = Omit<Interactions, 'id' | 'created_at' | 'updated_at'>;
  export type SearchQueriesInsert = Omit<SearchQueries, 'id' | 'created_at' | 'updated_at'>;
  export type ProjectInsightsInsert = Omit<ProjectInsights, 'id' | 'created_at' | 'updated_at'>;
  export type WebhookEventsInsert = Omit<WebhookEvents, 'id' | 'created_at' | 'updated_at'>;
  export type ProcessingQueueInsert = Omit<ProcessingQueue, 'id' | 'created_at' | 'updated_at'>;
  export type SystemMetadataInsert = Omit<SystemMetadata, 'id' | 'created_at' | 'updated_at'>;

  /**
   * Update Types (All fields optional)
   */
  export type MeetingsUpdate = Partial<MeetingsInsert>;
  export type MeetingChunksUpdate = Partial<MeetingChunksInsert>;
  export type VectorIndexUpdate = Partial<VectorIndexInsert>;
  export type ProjectsUpdate = Partial<ProjectsInsert>;
  export type ClientsUpdate = Partial<ClientsInsert>;
  export type EmployeesUpdate = Partial<EmployeesInsert>;
  export type DocumentMetadataUpdate = Partial<DocumentMetadataInsert>;
  export type TasksUpdate = Partial<TasksInsert>;
  export type SubcontractorsUpdate = Partial<SubcontractorsInsert>;
  export type ProjectSubcontractorsUpdate = Partial<ProjectSubcontractorsInsert>;
  export type InteractionsUpdate = Partial<InteractionsInsert>;
  export type SearchQueriesUpdate = Partial<SearchQueriesInsert>;
  export type ProjectInsightsUpdate = Partial<ProjectInsightsInsert>;
  export type WebhookEventsUpdate = Partial<WebhookEventsInsert>;
  export type ProcessingQueueUpdate = Partial<ProcessingQueueInsert>;
  export type SystemMetadataUpdate = Partial<SystemMetadataInsert>;

  /**
   * Enum Types
   */
  export type MeetingPriority = 'low' | 'medium' | 'high' | 'critical';
  export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  export type ClientType = 'commercial' | 'residential' | 'government' | 'non-profit';
  export type EmployeeRole = 'project-manager' | 'superintendent' | 'estimator' | 'foreman' | 'admin' | 'executive';
  export type ChunkType = 'full' | 'time_segment' | 'speaker_turn';
  export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

  /**
   * JSON Field Types
   */
  export interface ActionItem {
    id: string;
    description: string;
    assignee?: string;
    due_date?: string;
    completed?: boolean;
  }

  export interface Decision {
    id: string;
    description: string;
    made_by?: string;
    date?: string;
  }

  export interface Participant {
    name: string;
    email?: string;
    role?: string;
  }

  /**
   * Query Result Types
   */
  export interface MeetingWithProject extends Meetings {
    project?: Projects;
  }

  export interface ProjectWithClient extends Projects {
    client?: Clients;
    meetings?: Meetings[];
    documents?: DocumentMetadata[];
  }

  export interface ChunkWithVector extends MeetingChunks {
    vector_index?: VectorIndex;
  }
}

/**
 * Helper Types
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
