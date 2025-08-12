import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    const db = env.DB;
    
    const results = {
      tablesCreated: [],
      errors: [],
      success: true
    };

    // Create meetings table
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS meetings (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          date TEXT NOT NULL,
          duration INTEGER,
          participants TEXT,
          transcript TEXT,
          summary TEXT,
          action_items TEXT,
          project_id TEXT,
          r2_path TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
      `).run();
      
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_meetings_project ON meetings(project_id);
      `).run();
      
      results.tablesCreated.push('meetings');
    } catch (error) {
      results.errors.push(`Failed to create meetings table: ${error}`);
      results.success = false;
    }

    // Create projects table
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT,
          client_id TEXT,
          start_date TEXT,
          end_date TEXT,
          budget REAL,
          notion_id TEXT UNIQUE,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
      `).run();
      
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      `).run();
      
      results.tablesCreated.push('projects');
    } catch (error) {
      results.errors.push(`Failed to create projects table: ${error}`);
      results.success = false;
    }

    // Create clients table
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          company TEXT,
          address TEXT,
          notes TEXT,
          notion_id TEXT UNIQUE,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);
      `).run();
      
      results.tablesCreated.push('clients');
    } catch (error) {
      results.errors.push(`Failed to create clients table: ${error}`);
      results.success = false;
    }

    // Create documents table
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          type TEXT,
          content TEXT,
          project_id TEXT,
          client_id TEXT,
          r2_path TEXT,
          file_size INTEGER,
          mime_type TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
      `).run();
      
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
      `).run();
      
      results.tablesCreated.push('documents');
    } catch (error) {
      results.errors.push(`Failed to create documents table: ${error}`);
      results.success = false;
    }

    // Create vectorization_status table
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS vectorization_status (
          id TEXT PRIMARY KEY,
          document_id TEXT,
          meeting_id TEXT,
          status TEXT DEFAULT 'pending',
          vector_ids TEXT,
          chunk_count INTEGER DEFAULT 0,
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_vectorization_document ON vectorization_status(document_id);
      `).run();
      
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_vectorization_meeting ON vectorization_status(meeting_id);
      `).run();
      
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_vectorization_status ON vectorization_status(status);
      `).run();
      
      results.tablesCreated.push('vectorization_status');
    } catch (error) {
      results.errors.push(`Failed to create vectorization_status table: ${error}`);
      results.success = false;
    }

    // Verify all tables were created
    const tableCheck = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();

    return NextResponse.json({
      ...results,
      allTables: tableCheck.results.map((t: any) => t.name),
      message: results.success 
        ? 'Database initialized successfully' 
        : 'Database initialization completed with errors'
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';