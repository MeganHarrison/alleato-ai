#!/usr/bin/env node

/**
 * Generate TypeScript types from D1 database schema
 * Similar to Supabase's type generation
 * 
 * Usage: node scripts/generate-d1-types.js
 */

const fs = require('fs');
const path = require('path');

// SQL to TypeScript type mappings
const sqlToTsType = {
  'TEXT': 'string',
  'INTEGER': 'number',
  'REAL': 'number',
  'BOOLEAN': 'boolean',
  'DATETIME': 'string',
  'DATE': 'string',
  'BLOB': 'ArrayBuffer',
};

// Tables configuration with their relationships
const tablesConfig = {
  meetings: {
    jsonFields: ['participants', 'attendees', 'action_items', 'decisions', 'keywords', 'tags'],
    relations: {
      project: 'projects',
      client: 'clients'
    }
  },
  meeting_chunks: {
    relations: {
      meeting: 'meetings'
    }
  },
  vector_index: {
    relations: {
      chunk: 'meeting_chunks',
      meeting: 'meetings'
    }
  },
  projects: {
    relations: {
      client: 'clients',
      project_manager: 'employees',
      superintendent: 'employees',
      estimator: 'employees'
    }
  },
  clients: {
    jsonFields: [],
    relations: {}
  },
  employees: {
    relations: {}
  },
  document_metadata: {
    jsonFields: ['keywords', 'tags', 'action_items', 'decisions'],
    relations: {
      project: 'projects',
      client: 'clients'
    }
  },
  tasks: {
    relations: {
      project: 'projects',
      assigned_to: 'employees'
    }
  },
  subcontractors: {
    relations: {}
  },
  project_subcontractors: {
    relations: {
      project: 'projects',
      subcontractor: 'subcontractors'
    }
  },
  interactions: {
    relations: {}
  },
  search_queries: {
    jsonFields: ['filters', 'clicked_results'],
    relations: {}
  },
  project_insights: {
    relations: {
      project: 'projects'
    }
  },
  webhook_events: {
    jsonFields: ['payload'],
    relations: {}
  },
  processing_queue: {
    jsonFields: ['payload'],
    relations: {}
  },
  system_metadata: {
    relations: {}
  }
};

// Generate types based on the schema
function generateTypes() {
  let output = `/**
 * Auto-generated TypeScript types for Alleato D1 Database
 * Generated on: ${new Date().toISOString()}
 * 
 * DO NOT EDIT MANUALLY - This file is auto-generated
 * Run 'npm run generate-types' to regenerate
 */

export namespace Database {
  /**
   * Database Tables
   */
`;

  // Generate table interfaces
  for (const [tableName, config] of Object.entries(tablesConfig)) {
    output += generateTableInterface(tableName, config);
  }

  // Generate Insert/Update types
  output += `
  /**
   * Insert Types (Omit auto-generated fields)
   */
`;

  for (const tableName of Object.keys(tablesConfig)) {
    output += `  export type ${toPascalCase(tableName)}Insert = Omit<${toPascalCase(tableName)}, 'id' | 'created_at' | 'updated_at'>;\n`;
  }

  output += `
  /**
   * Update Types (All fields optional)
   */
`;

  for (const tableName of Object.keys(tablesConfig)) {
    output += `  export type ${toPascalCase(tableName)}Update = Partial<${toPascalCase(tableName)}Insert>;\n`;
  }

  // Generate enum types
  output += `
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
`;

  return output;
}

function generateTableInterface(tableName, config) {
  const interfaceName = toPascalCase(tableName);
  const fields = getTableFields(tableName);
  
  let output = `
  export interface ${interfaceName} {
`;

  for (const field of fields) {
    const tsType = getFieldType(field, config.jsonFields || []);
    const optional = field.nullable ? '?' : '';
    output += `    ${field.name}${optional}: ${tsType};\n`;
  }

  output += `  }\n`;
  return output;
}

function getTableFields(tableName) {
  // This is a simplified version - in a real implementation,
  // you would query the actual D1 database schema
  const commonFields = [
    { name: 'id', type: 'TEXT', nullable: false },
    { name: 'created_at', type: 'DATETIME', nullable: false },
    { name: 'updated_at', type: 'DATETIME', nullable: false }
  ];

  const tableSpecificFields = {
    meetings: [
      { name: 'title', type: 'TEXT', nullable: false },
      { name: 'date', type: 'TEXT', nullable: true },
      { name: 'date_time', type: 'DATETIME', nullable: true },
      { name: 'duration', type: 'INTEGER', nullable: true },
      { name: 'project_id', type: 'TEXT', nullable: true },
      { name: 'client_id', type: 'TEXT', nullable: true },
      { name: 'participants', type: 'TEXT', nullable: true },
      { name: 'attendees', type: 'TEXT', nullable: true },
      { name: 'organizer_email', type: 'TEXT', nullable: true },
      { name: 'summary', type: 'TEXT', nullable: true },
      { name: 'action_items', type: 'TEXT', nullable: true },
      { name: 'decisions', type: 'TEXT', nullable: true },
      { name: 'keywords', type: 'TEXT', nullable: true },
      { name: 'tags', type: 'TEXT', nullable: true },
      { name: 'category', type: 'TEXT', nullable: true },
      { name: 'priority', type: 'TEXT', nullable: true },
      { name: 'department', type: 'TEXT', nullable: true },
      { name: 'fireflies_id', type: 'TEXT', nullable: true },
      { name: 'transcript_downloaded', type: 'BOOLEAN', nullable: true },
      { name: 'vector_processed', type: 'BOOLEAN', nullable: true },
      { name: 'r2_key', type: 'TEXT', nullable: true },
      { name: 'searchable_text', type: 'TEXT', nullable: true },
      { name: 'word_count', type: 'INTEGER', nullable: true }
    ],
    meeting_chunks: [
      { name: 'meeting_id', type: 'TEXT', nullable: false },
      { name: 'chunk_index', type: 'INTEGER', nullable: false },
      { name: 'chunk_type', type: 'TEXT', nullable: true },
      { name: 'content', type: 'TEXT', nullable: false },
      { name: 'speaker', type: 'TEXT', nullable: true },
      { name: 'start_time', type: 'INTEGER', nullable: true },
      { name: 'end_time', type: 'INTEGER', nullable: true },
      { name: 'embedding', type: 'BLOB', nullable: true },
      { name: 'embedding_model', type: 'TEXT', nullable: true }
    ],
    vector_index: [
      { name: 'chunk_id', type: 'TEXT', nullable: false },
      { name: 'meeting_id', type: 'TEXT', nullable: false },
      { name: 'meeting_title', type: 'TEXT', nullable: true },
      { name: 'meeting_date', type: 'TEXT', nullable: true },
      { name: 'chunk_preview', type: 'TEXT', nullable: true },
      { name: 'relevance_score', type: 'REAL', nullable: true }
    ],
    projects: [
      { name: 'title', type: 'TEXT', nullable: false },
      { name: 'description', type: 'TEXT', nullable: true },
      { name: 'status', type: 'TEXT', nullable: true },
      { name: 'priority', type: 'TEXT', nullable: true },
      { name: 'client_id', type: 'TEXT', nullable: true },
      { name: 'project_manager_id', type: 'TEXT', nullable: true },
      { name: 'superintendent_id', type: 'TEXT', nullable: true },
      { name: 'estimator_id', type: 'TEXT', nullable: true },
      { name: 'estimated_value', type: 'REAL', nullable: true },
      { name: 'actual_cost', type: 'REAL', nullable: true },
      { name: 'budget', type: 'REAL', nullable: true },
      { name: 'profit_margin', type: 'REAL', nullable: true },
      { name: 'start_date', type: 'DATE', nullable: true },
      { name: 'estimated_completion', type: 'DATE', nullable: true },
      { name: 'actual_completion', type: 'DATE', nullable: true },
      { name: 'autorag_project_tag', type: 'TEXT', nullable: true },
      { name: 'document_count', type: 'INTEGER', nullable: true },
      { name: 'last_meeting_date', type: 'DATE', nullable: true },
      { name: 'notion_id', type: 'TEXT', nullable: true }
    ],
    clients: [
      { name: 'company_name', type: 'TEXT', nullable: false },
      { name: 'contact_person', type: 'TEXT', nullable: true },
      { name: 'email', type: 'TEXT', nullable: true },
      { name: 'phone', type: 'TEXT', nullable: true },
      { name: 'address', type: 'TEXT', nullable: true },
      { name: 'client_type', type: 'TEXT', nullable: true },
      { name: 'credit_rating', type: 'TEXT', nullable: true },
      { name: 'total_project_value', type: 'REAL', nullable: true },
      { name: 'active_projects_count', type: 'INTEGER', nullable: true },
      { name: 'notion_id', type: 'TEXT', nullable: true }
    ]
  };

  const fields = [...commonFields];
  
  // Remove duplicate created_at/updated_at if table doesn't have them
  const specificFields = tableSpecificFields[tableName] || [];
  
  return [...specificFields, ...fields.filter(f => 
    !specificFields.some(sf => sf.name === f.name)
  )];
}

function getFieldType(field, jsonFields) {
  if (jsonFields.includes(field.name)) {
    // Specific JSON types
    switch (field.name) {
      case 'participants':
      case 'attendees':
        return 'Participant[]';
      case 'action_items':
        return 'ActionItem[]';
      case 'decisions':
        return 'Decision[]';
      case 'keywords':
      case 'tags':
      case 'clicked_results':
        return 'string[]';
      case 'filters':
      case 'payload':
        return 'Json';
      default:
        return 'Json';
    }
  }
  
  return sqlToTsType[field.type] || 'unknown';
}

function toPascalCase(str) {
  return str.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Generate and write the types file
const types = generateTypes();
const outputPath = path.join(__dirname, '..', 'types', 'd1-database.ts');

// Ensure types directory exists
const typesDir = path.dirname(outputPath);
if (!fs.existsSync(typesDir)) {
  fs.mkdirSync(typesDir, { recursive: true });
}

fs.writeFileSync(outputPath, types);
console.log(`✅ Generated types at: ${outputPath}`);

// Also update package.json to include the generate script
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.scripts['generate-types']) {
  packageJson.scripts['generate-types'] = 'node scripts/generate-d1-types.js';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Added generate-types script to package.json');
}