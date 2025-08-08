import { Client } from '@notionhq/client';

export interface Env {
  ALLEATO_DB: D1Database;
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
}

interface NotionProject {
  id: string;
  properties: {
    'Project name'?: { title: Array<{ plain_text: string }> };
    'Job #'?: { rich_text: Array<{ plain_text: string }> };
    'Address'?: { rich_text: Array<{ plain_text: string }> };
    'Est Revenue'?: { number: number | null };
    'Est Profit'?: { number: number | null };
    'Phase'?: { status?: { name: string } };
    'Priority'?: { select?: { name: string } };
    'Start Date'?: { date?: { start: string } };
    'Est Completion Date'?: { date?: { start: string } };
  };
}

function initNotionClient(apiKey: string) {
  return new Client({
    auth: apiKey,
  });
}

function extractProjectData(notionPage: NotionProject) {
  const props = notionPage.properties;
  
  // Extract title
  const title = props['Project name']?.title?.[0]?.plain_text || 'Untitled Project';
  
  // Extract job ID or generate one
  const jobId = props['Job #']?.rich_text?.[0]?.plain_text || `notion-${notionPage.id.substring(0, 8)}`;
  
  // Extract other fields
  const address = props['Address']?.rich_text?.[0]?.plain_text || null;
  const revenue = props['Est Revenue']?.number || 0;
  const profit = props['Est Profit']?.number || 0;
  const status = props['Phase']?.status?.name || 'planning';
  const priority = props['Priority']?.select?.name?.toLowerCase() || 'medium';
  const startDate = props['Start Date']?.date?.start || null;
  const estCompletion = props['Est Completion Date']?.date?.start || null;
  
  return {
    id: jobId,
    notion_id: notionPage.id,
    title,
    project_address: address,
    estimated_value: revenue,
    // Calculate profit margin from revenue and profit if possible
    profit_margin: revenue > 0 ? profit / revenue : 0,
    status: mapNotionStatusToD1(status),
    priority: mapNotionPriorityToD1(priority),
    start_date: startDate,
    estimated_completion: estCompletion,
  };
}

function mapNotionStatusToD1(notionStatus: string): string {
  const statusMap: Record<string, string> = {
    'Not started': 'planning',
    'In progress': 'active',
    'On hold': 'on-hold',
    'Complete': 'completed',
    'Cancelled': 'cancelled',
  };
  
  return statusMap[notionStatus] || 'planning';
}

function mapNotionPriorityToD1(notionPriority: string): string {
  const priority = notionPriority.toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(priority)) {
    return priority;
  }
  return 'medium';
}

async function syncNotionToD1(env: Env) {
  const notion = initNotionClient(env.NOTION_API_KEY);
  const results = [];

  try {
    // Fetch all pages from Notion database
    const response = await notion.databases.query({
      database_id: env.NOTION_DATABASE_ID,
    });

    console.log(`Found ${response.results.length} projects in Notion`);

    for (const page of response.results) {
      if (!('properties' in page)) continue;
      
      try {
        const projectData = extractProjectData(page as NotionProject);
        
        // Check if project already exists in D1
        const existing = await env.ALLEATO_DB.prepare(
          'SELECT id FROM projects WHERE id = ? OR notion_id = ?'
        ).bind(projectData.id, projectData.notion_id).first();

        if (existing) {
          // Update existing project
          await env.ALLEATO_DB.prepare(`
            UPDATE projects 
            SET 
              title = ?,
              project_address = ?,
              estimated_value = ?,
              profit_margin = ?,
              status = ?,
              priority = ?,
              start_date = ?,
              estimated_completion = ?,
              notion_id = ?,
              updated_at = datetime('now')
            WHERE id = ? OR notion_id = ?
          `).bind(
            projectData.title,
            projectData.project_address,
            projectData.estimated_value,
            projectData.profit_margin,
            projectData.status,
            projectData.priority,
            projectData.start_date,
            projectData.estimated_completion,
            projectData.notion_id,
            projectData.id,
            projectData.notion_id
          ).run();
          
          results.push({ project: projectData.title, status: 'updated', id: projectData.id });
        } else {
          // Insert new project
          await env.ALLEATO_DB.prepare(`
            INSERT INTO projects (
              id, notion_id, title, project_address, estimated_value,
              profit_margin, status, priority, start_date, estimated_completion,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            projectData.id,
            projectData.notion_id,
            projectData.title,
            projectData.project_address,
            projectData.estimated_value,
            projectData.profit_margin,
            projectData.status,
            projectData.priority,
            projectData.start_date,
            projectData.estimated_completion
          ).run();
          
          results.push({ project: projectData.title, status: 'created', id: projectData.id });
        }
      } catch (error) {
        console.error(`Error syncing project from Notion:`, error);
        results.push({
          project: 'properties' in page ? extractProjectData(page as NotionProject).title : 'Unknown',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error syncing from Notion to D1:', error);
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/sync' && request.method === 'POST') {
      try {
        const results = await syncNotionToD1(env);
        
        const created = results.filter(r => r.status === 'created').length;
        const updated = results.filter(r => r.status === 'updated').length;
        const errors = results.filter(r => r.status === 'error').length;

        return new Response(JSON.stringify({
          success: true,
          summary: {
            created,
            updated,
            errors,
            total: results.length
          },
          results
        }), {
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

    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Running scheduled Notion to D1 sync at', new Date().toISOString());
    await syncNotionToD1(env);
  },
};