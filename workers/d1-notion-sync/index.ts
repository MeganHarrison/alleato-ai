import { Client } from '@notionhq/client';

export interface Env {
  ALLEATO_DB: D1Database;
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
}

interface Project {
  id: string;
  title: string;
  description?: string;
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
  status?: string;
  priority?: string;
  project_type?: string;
  project_address?: string;
  created_at?: string;
  updated_at?: string;
}

function initNotionClient(apiKey: string) {
  return new Client({
    auth: apiKey,
  });
}

function mapProjectToNotionProperties(project: Project) {
  return {
    'Project name': {
      title: [
        {
          text: {
            content: project.title || 'Untitled Project',
          },
        },
      ],
    },
    'Job #': {
      rich_text: [
        {
          text: {
            content: project.id,
          },
        },
      ],
    },
    'Address': {
      rich_text: [
        {
          text: {
            content: project.project_address || '',
          },
        },
      ],
    },
    'Est Revenue': {
      number: project.estimated_value || 0,
    },
    'Est Profit': {
      number: project.profit_margin ? (project.estimated_value || 0) * project.profit_margin : 0,
    },
  };
}

async function syncProjectsToNotion(
  notionClient: Client,
  databaseId: string,
  projects: Project[]
) {
  const results = [];

  try {
    // Get existing pages to check for duplicates
    const existingPages = await notionClient.databases.query({
      database_id: databaseId,
    });

    // Create a map of existing pages by Job #
    const existingMap = new Map();
    for (const page of existingPages.results) {
      if ('properties' in page) {
        const jobNumber = page.properties['Job #'];
        if (jobNumber && 'rich_text' in jobNumber && jobNumber.rich_text.length > 0) {
          const jobId = jobNumber.rich_text[0].plain_text;
          existingMap.set(jobId, page.id);
        }
      }
    }

    // Sync each project
    for (const project of projects) {
      try {
        const properties = mapProjectToNotionProperties(project);
        const jobId = project.id;

        if (existingMap.has(jobId)) {
          // Update existing page
          const pageId = existingMap.get(jobId);
          const response = await notionClient.pages.update({
            page_id: pageId,
            properties,
          });
          results.push({ project: project.title, status: 'updated', pageId: response.id });
        } else {
          // Create new page
          const response = await notionClient.pages.create({
            parent: { database_id: databaseId },
            properties,
          });
          results.push({ project: project.title, status: 'created', pageId: response.id });
        }
      } catch (error) {
        console.error(`Error syncing project "${project.title}":`, error);
        results.push({
          project: project.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error syncing to Notion:', error);
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/sync' && request.method === 'POST') {
      return handleManualSync(env);
    }

    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Running scheduled sync at', new Date().toISOString());
    await performSync(env);
  },
};

async function handleManualSync(env: Env): Promise<Response> {
  try {
    const results = await performSync(env);
    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function performSync(env: Env) {
  // Query projects from D1
  const { results: projects } = await env.ALLEATO_DB.prepare(
    `SELECT 
      id,
      title,
      description,
      client_id,
      project_manager_id,
      superintendent_id,
      estimator_id,
      estimated_value,
      actual_cost,
      budget,
      profit_margin,
      start_date,
      estimated_completion,
      actual_completion,
      status,
      priority,
      project_type,
      project_address,
      created_at,
      updated_at
    FROM projects
    ORDER BY created_at DESC`
  ).all<Project>();

  if (!projects || projects.length === 0) {
    console.log('No projects found in D1 database');
    return [];
  }

  console.log(`Found ${projects.length} projects in D1 database`);

  // Initialize Notion client
  const notion = initNotionClient(env.NOTION_API_KEY);

  // Sync to Notion
  const results = await syncProjectsToNotion(
    notion,
    env.NOTION_DATABASE_ID,
    projects
  );

  const created = results.filter(r => r.status === 'created').length;
  const updated = results.filter(r => r.status === 'updated').length;
  const errors = results.filter(r => r.status === 'error').length;

  console.log(`Sync complete: ${created} created, ${updated} updated, ${errors} errors`);

  return results;
}