/**
 * Alleato API Worker
 * Separate Cloudflare Worker with direct D1 database access
 */

export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  PROJECT_CACHE: KVNamespace;
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
  NOTION_CLIENTS_DATABASE_ID: string;
  OPENAI_API_KEY: string;
  FIREFLIES_API_KEY: string;
}

// CORS headers for the frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, replace with your domain
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route handlers
      switch (path) {
        case '/api/projects':
          return await handleProjects(request, env);
        
        case '/api/clients':
          return await handleClients(request, env);
        
        case '/api/meetings':
          return await handleMeetings(request, env);
        
        case '/api/documents':
          return await handleDocuments(request, env);
        
        case '/api/sync-status':
          return await handleSyncStatus(request, env);
        
        case '/api/user':
          return await handleUser(request, env);
        
        case '/api/test':
          return await handleTest(request, env);
        
        case '/api/test-r2':
          return await handleTestR2(request, env);
        
        default:
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};

// Projects handler
async function handleProjects(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    try {
      // Check if D1 is available
      if (!env.DB) {
        // Return mock data if D1 is not available
        const mockProjects = [
          {
            id: 1,
            header: "Fire Protection System Design",
            type: "Project",
            status: "In Progress",
            target: "150000",
            limit: "15.0%",
            reviewer: "Eddie Lake",
          },
          {
            id: 2,
            header: "Commercial Sprinkler Installation",
            type: "Project",
            status: "Planning",
            target: "85000",
            limit: "12.5%",
            reviewer: "Jamik Tashpulatov",
          },
        ];
        
        return new Response(
          JSON.stringify({
            success: true,
            projects: mockProjects,
            total: mockProjects.length,
            usingMockData: true,
            message: "D1 not configured - using mock data"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Query projects from D1
      const { results } = await env.DB.prepare(`
        SELECT 
          id,
          name as header,
          status,
          description,
          client_id,
          start_date,
          end_date,
          budget as estimated_value,
          notion_id,
          created_at,
          updated_at
        FROM projects
        ORDER BY id DESC
        LIMIT 100
      `).all();

      // Transform to match frontend expectations
      const projects = results?.map((project: any) => ({
        id: project.id,
        header: project.header || 'Untitled Project',
        type: 'Project',
        status: project.status || 'Unknown',
        target: project.estimated_value?.toString() || '0',
        limit: '15.0%', // Default value
        reviewer: 'Unassigned',
        notion_id: project.notion_id,
        created_at: project.created_at,
        updated_at: project.updated_at,
      })) || [];

      return new Response(
        JSON.stringify({
          success: true,
          projects,
          total: projects.length,
          usingMockData: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Projects error:', error);
      // Return mock data on error
      const mockProjects = [
        {
          id: 1,
          header: "Error Loading Projects",
          type: "Project",
          status: "Error",
          target: "0",
          limit: "0%",
          reviewer: "System",
        },
      ];
      
      return new Response(
        JSON.stringify({
          success: false,
          projects: mockProjects,
          total: 1,
          usingMockData: true,
          error: error instanceof Error ? error.message : 'Database error',
        }),
        {
          status: 200, // Return 200 with error in body to avoid breaking frontend
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Clients handler
async function handleClients(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    try {
      if (!env.DB) {
        return new Response(
          JSON.stringify({
            success: true,
            clients: [],
            message: "D1 not configured"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { results } = await env.DB.prepare(`
        SELECT 
          id,
          company,
          address,
          website,
          status,
          notion_id
        FROM clients
        ORDER BY company
        LIMIT 100
      `).all();

      return new Response(
        JSON.stringify({
          success: true,
          clients: results || [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Clients error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          clients: [],
          error: error instanceof Error ? error.message : 'Database error',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Meetings handler
async function handleMeetings(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    try {
      // Try D1 first
      let hasD1Results = false;
      if (env.DB) {
        try {
          const { results } = await env.DB.prepare(`
            SELECT *
            FROM meetings
            ORDER BY date DESC
            LIMIT 100
          `).all();

          if (results && results.length > 0) {
            return new Response(
              JSON.stringify({
                success: true,
                meetings: results,
                files: results.map(m => ({
                  filename: m.r2_path || m.title,
                  path: m.r2_path || m.title,
                  size: 0,
                  uploaded: m.created_at || m.date,
                  date: m.date,
                  title: m.title,
                })),
                total: results.length,
                totalObjects: results.length,
                source: 'database',
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        } catch (dbError) {
          console.error('D1 query error:', dbError);
          // Continue to R2 fallback
        }
      }

      // Fallback to R2 if D1 is empty or errored
      if (env.R2_BUCKET) {
        const listed = await env.R2_BUCKET.list({ limit: 1000 });
        const meetings = listed.objects.map(obj => ({
          filename: obj.key,
          path: obj.key,
          size: obj.size,
          uploaded: obj.uploaded.toISOString(),
          date: obj.uploaded.toISOString().split('T')[0],
          title: obj.key.replace(/\.(md|txt)$/, '').replace(/_/g, ' '),
        }));

        return new Response(
          JSON.stringify({
            success: true,
            files: meetings,  // Frontend expects 'files'
            meetings,  // Keep for backward compatibility
            totalObjects: listed.objects.length,
            total: meetings.length,
            source: 'r2',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Return mock data as last resort
      const mockMeetings = [
        {
          id: "1",
          title: "Project Planning Meeting",
          date: "2025-08-12",
          duration: 60,
          participants: '["john@example.com", "jane@example.com"]',
          summary: "Discussed project timeline",
        },
      ];

      return new Response(
        JSON.stringify({
          success: true,
          meetings: mockMeetings,
          total: 1,
          source: 'mock',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Meetings error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          meetings: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Documents handler
async function handleDocuments(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    const mockDocuments = [
      {
        id: 1,
        title: "Project Proposal - Fire Suppression System",
        type: "proposal",
        client: "ABC Corporation",
        created_at: "2025-01-15T00:00:00Z",
        size: "2.4 MB",
        status: "approved",
      },
      {
        id: 2,
        title: "Technical Specifications Document",
        type: "specification",
        client: "XYZ Industries",
        created_at: "2025-01-20T00:00:00Z",
        size: "1.8 MB",
        status: "draft",
      },
    ];

    return new Response(
      JSON.stringify({
        success: true,
        documents: mockDocuments,
        total: mockDocuments.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Sync Status handler
async function handleSyncStatus(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    const statuses = [
      {
        service: 'D1 Database',
        status: env.DB ? 'success' : 'error',
        message: env.DB ? 'Connected' : 'Not configured',
      },
      {
        service: 'R2 Storage',
        status: env.R2_BUCKET ? 'success' : 'warning',
        message: env.R2_BUCKET ? 'Connected' : 'Not configured',
      },
      {
        service: 'KV Cache',
        status: env.PROJECT_CACHE ? 'success' : 'warning',
        message: env.PROJECT_CACHE ? 'Connected' : 'Not configured',
      },
      {
        service: 'Notion API',
        status: env.NOTION_API_KEY && env.NOTION_API_KEY !== 'YOUR_NOTION_API_KEY' ? 'success' : 'error',
        message: env.NOTION_API_KEY && env.NOTION_API_KEY !== 'YOUR_NOTION_API_KEY' ? 'Configured' : 'API key not set',
      },
    ];

    return new Response(
      JSON.stringify({
        success: true,
        statuses,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// User handler
async function handleUser(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    const mockUser = {
      id: "1",
      name: "John Doe",
      email: "john@asrsfireprotection.com",
      role: "Administrator",
      company: "ASR's Fire Protection",
      avatar: "/api/placeholder/150/150",
      permissions: ["view_all", "edit_all", "admin"],
    };

    return new Response(
      JSON.stringify({
        success: true,
        user: mockUser,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Test handler to verify Worker is running
async function handleTest(request: Request, env: Env): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'API Worker is running',
      timestamp: new Date().toISOString(),
      env: {
        hasDB: !!env.DB,
        hasR2: !!env.R2_BUCKET,
        hasKV: !!env.PROJECT_CACHE,
        hasNotionKey: !!env.NOTION_API_KEY,
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function handleTestR2(request: Request, env: Env): Promise<Response> {
  if (!env.R2_BUCKET) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'R2 bucket not configured' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const listed = await env.R2_BUCKET.list({ limit: 10 });
    return new Response(
      JSON.stringify({
        success: true,
        firefliesConnected: true,
        count: listed.objects.length,
        totalObjects: listed.objects.length,
        truncated: listed.truncated,
        files: listed.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded.toISOString(),
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list R2 objects',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}