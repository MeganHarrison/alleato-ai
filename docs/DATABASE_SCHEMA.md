# Alleato D1 Database Schema

**Database ID**: `fc7c9a6d-ca65-4768-b3f9-07ec5afb38c5`  
**Last Updated**: August 8, 2025

## Overview

The Alleato database is a comprehensive system designed for project management, meeting transcript analysis, and AI-powered search using vector embeddings. It combines traditional relational data with modern RAG (Retrieval Augmented Generation) capabilities.

## Core Tables

### 1. meetings
Stores meeting information from various sources including Fireflies.ai

```sql
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  date_time DATETIME,
  duration INTEGER,
  
  -- Relationships
  project_id TEXT,
  client_id TEXT,
  
  -- Participants
  participants TEXT, -- JSON array
  attendees TEXT,    -- JSON array
  organizer_email TEXT,
  
  -- Content & Analysis
  summary TEXT,
  action_items TEXT, -- JSON array
  decisions TEXT,    -- JSON array
  keywords TEXT,     -- JSON array
  tags TEXT,
  category TEXT,
  priority TEXT,
  department TEXT,
  
  -- Integration Fields
  fireflies_id TEXT,
  transcript_downloaded BOOLEAN DEFAULT FALSE,
  vector_processed BOOLEAN DEFAULT FALSE,
  r2_key TEXT,
  
  -- Search Optimization
  searchable_text TEXT,
  word_count INTEGER,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Indexes
CREATE INDEX idx_meetings_date ON meetings(date);
CREATE INDEX idx_meetings_project ON meetings(project_id);
CREATE INDEX idx_meetings_client ON meetings(client_id);
CREATE INDEX idx_meetings_fireflies ON meetings(fireflies_id);
```

### 2. meeting_chunks
Stores chunked meeting content for vector processing

```sql
CREATE TABLE meeting_chunks (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_type TEXT CHECK(chunk_type IN ('full', 'time_segment', 'speaker_turn')),
  
  -- Content
  content TEXT NOT NULL,
  speaker TEXT,
  start_time INTEGER, -- in seconds
  end_time INTEGER,   -- in seconds
  
  -- Vector Data
  embedding BLOB, -- Binary storage for efficiency
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_chunks_meeting ON meeting_chunks(meeting_id);
CREATE INDEX idx_chunks_type ON meeting_chunks(chunk_type);
```

### 3. vector_index
Optimized table for vector similarity search

```sql
CREATE TABLE vector_index (
  id TEXT PRIMARY KEY,
  chunk_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  
  -- Denormalized for Performance
  meeting_title TEXT,
  meeting_date TEXT,
  chunk_preview TEXT, -- First 200 chars
  relevance_score REAL,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (chunk_id) REFERENCES meeting_chunks(id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);

-- Indexes for Vector Search
CREATE INDEX idx_vector_meeting ON vector_index(meeting_id);
CREATE INDEX idx_vector_date ON vector_index(meeting_date);
CREATE INDEX idx_vector_relevance ON vector_index(relevance_score);
```

### 4. projects
Central project management table

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  
  -- Client Relationship
  client_id TEXT,
  
  -- Team Assignments
  project_manager_id TEXT,
  superintendent_id TEXT,
  estimator_id TEXT,
  
  -- Financial
  estimated_value REAL,
  actual_cost REAL,
  budget REAL,
  profit_margin REAL,
  
  -- Timeline
  start_date DATE,
  estimated_completion DATE,
  actual_completion DATE,
  
  -- RAG Integration
  autorag_project_tag TEXT,
  document_count INTEGER DEFAULT 0,
  last_meeting_date DATE,
  
  -- Integration
  notion_id TEXT UNIQUE,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (project_manager_id) REFERENCES employees(id),
  FOREIGN KEY (superintendent_id) REFERENCES employees(id),
  FOREIGN KEY (estimator_id) REFERENCES employees(id)
);

-- Indexes
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_notion ON projects(notion_id);
```

### 5. clients
Client management with Notion integration

```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  
  -- Classification
  client_type TEXT DEFAULT 'commercial' 
    CHECK(client_type IN ('commercial', 'residential', 'government', 'non-profit')),
  
  -- Metrics
  credit_rating TEXT,
  total_project_value REAL DEFAULT 0,
  active_projects_count INTEGER DEFAULT 0,
  
  -- Integration
  notion_id TEXT UNIQUE,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_notion ON clients(notion_id);
```

### 6. employees
Employee management

```sql
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- Role & Department
  role TEXT CHECK(role IN (
    'project-manager', 'superintendent', 'estimator', 
    'foreman', 'admin', 'executive'
  )),
  department TEXT,
  
  -- Employment Details
  hire_date DATE,
  hourly_rate REAL,
  salary REAL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  active_projects_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_active ON employees(is_active);
```

### 7. document_metadata
Document management with RAG optimization

```sql
CREATE TABLE document_metadata (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  title TEXT,
  document_type TEXT,
  
  -- Relationships
  project_id TEXT,
  client_id TEXT,
  
  -- Organization
  category TEXT,
  subcategory TEXT,
  
  -- RAG Fields
  r2_key TEXT,
  vector_embedding_id TEXT,
  content_hash TEXT,
  searchable_text TEXT,
  
  -- Extracted Insights
  summary TEXT,
  keywords TEXT, -- JSON array
  tags TEXT,     -- JSON array
  action_items TEXT, -- JSON array
  decisions TEXT,    -- JSON array
  
  -- Metadata
  word_count INTEGER,
  mime_type TEXT,
  file_size INTEGER,
  
  -- Timestamps
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Indexes
CREATE INDEX idx_docs_project ON document_metadata(project_id);
CREATE INDEX idx_docs_type ON document_metadata(document_type);
CREATE INDEX idx_docs_r2 ON document_metadata(r2_key);
```

## Supporting Tables

### 8. tasks
Task management linked to projects

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assigned_to) REFERENCES employees(id)
);
```

### 9. subcontractors
Subcontractor management

```sql
CREATE TABLE subcontractors (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  trade TEXT,
  insurance_expiry DATE,
  license_number TEXT,
  rating REAL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 10. project_subcontractors
Many-to-many relationship for project assignments

```sql
CREATE TABLE project_subcontractors (
  project_id TEXT NOT NULL,
  subcontractor_id TEXT NOT NULL,
  scope_of_work TEXT,
  contract_amount REAL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (project_id, subcontractor_id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id)
);
```

## Analytics Tables

### 11. interactions
Query and response tracking

```sql
CREATE TABLE interactions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  query TEXT NOT NULL,
  response TEXT,
  context TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 12. search_queries
Search query logging

```sql
CREATE TABLE search_queries (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  filters TEXT, -- JSON
  results_count INTEGER,
  clicked_results TEXT, -- JSON array
  user_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 13. project_insights
AI-generated project summaries

```sql
CREATE TABLE project_insights (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  insight_type TEXT,
  content TEXT,
  confidence_score REAL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

## System Tables

### 14. webhook_events
Fireflies webhook tracking

```sql
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  processed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 15. processing_queue
Async task management

```sql
CREATE TABLE processing_queue (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  payload TEXT, -- JSON
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  scheduled_for DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 16. system_metadata
Key-value configuration store

```sql
CREATE TABLE system_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Views

### active_projects_dashboard
```sql
CREATE VIEW active_projects_dashboard AS
SELECT 
  p.*,
  c.company_name as client_name,
  COUNT(DISTINCT m.id) as meeting_count,
  COUNT(DISTINCT d.id) as document_count
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN meetings m ON p.id = m.project_id
LEFT JOIN document_metadata d ON p.id = d.project_id
WHERE p.status = 'active'
GROUP BY p.id;
```

### recent_activity
```sql
CREATE VIEW recent_activity AS
SELECT 
  'meeting' as type,
  id,
  title,
  date_time as activity_date,
  project_id
FROM meetings
WHERE date_time >= datetime('now', '-7 days')

UNION ALL

SELECT 
  'document' as type,
  id,
  title,
  uploaded_at as activity_date,
  project_id
FROM document_metadata
WHERE uploaded_at >= datetime('now', '-7 days')

ORDER BY activity_date DESC;
```

## Full-Text Search

### document_fts
Virtual table for full-text search

```sql
CREATE VIRTUAL TABLE document_fts USING fts5(
  title,
  content,
  keywords,
  content=document_metadata,
  content_rowid=rowid
);
```

## Key Relationships

1. **Meeting → Chunks**: One meeting can have multiple chunks
2. **Chunks → Vector Index**: Each chunk has one vector index entry
3. **Projects → Meetings/Documents**: Projects contain meetings and documents
4. **Clients → Projects**: Clients have multiple projects

## Notes

- All `TEXT` fields storing JSON should contain valid JSON arrays or objects
- Binary embeddings are stored as BLOB for efficiency
- Notion integration uses `notion_id` fields in clients and projects tables
- The vector_index table is denormalized for search performance
- Timestamps use SQLite's datetime functions

## Migration History

- Initial schema created
- Added vector tables for RAG functionality
- Added Notion integration fields
- Enhanced with analytics and insights tables