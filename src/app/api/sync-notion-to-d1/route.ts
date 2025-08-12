import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getNotionClient } from '@/lib/notion';

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    // Get Notion credentials
    const notionApiKey = env.NOTION_API_KEY || env.NOTION_INTEGRATION_TOKEN;
    const notionDatabaseId = env.NOTION_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
      return NextResponse.json(
        { error: 'Notion credentials not configured' },
        { status: 500 }
      );
    }

    // Check if D1 is available
    if (!env.DB) {
      return NextResponse.json(
        { error: 'D1 database not configured' },
        { status: 500 }
      );
    }

    const notion = getNotionClient(notionApiKey);
    const results = [];

    // Fetch all pages from Notion database
    const response = await notion.databases.query({
      database_id: notionDatabaseId,
    });

    console.log(`Found ${response.results.length} projects in Notion`);

    for (const page of response.results) {
      if (!('properties' in page)) continue;
      
      try {
        const props = page.properties as any;
        
        // Extract data from Notion properties
        const title = props['Project name']?.title?.[0]?.plain_text || 'Untitled Project';
        const jobNumber = props['Job #']?.rich_text?.[0]?.plain_text || '';
        
        // Extract numeric ID from Job # (e.g., "DOC-68" -> 68)
        let projectId: number;
        const match = jobNumber.match(/(\d+)/);
        if (match) {
          projectId = parseInt(match[1]);
        } else {
          // Generate a random ID for projects without a job number
          projectId = Math.floor(Math.random() * 900000) + 100000;
        }
        
        const address = props['Address']?.rich_text?.[0]?.plain_text || null;
        const revenue = props['Est Revenue']?.number || 0;
        const profit = props['Est Profit']?.number || 0;
        
        // Check if project exists
        const existing = await env.DB.prepare(
          'SELECT id FROM projects WHERE id = ? OR notion_id = ?'
        ).bind(projectId, page.id).first();

        if (existing) {
          // Update existing project
          await env.DB.prepare(`
            UPDATE projects 
            SET 
              title = ?,
              project_address = ?,
              estimated_value = ?,
              profit_margin = ?,
              notion_id = ?,
              updated_at = datetime('now')
            WHERE id = ? OR notion_id = ?
          `).bind(
            title,
            address,
            Number(revenue) || 0,
            revenue > 0 ? Number(profit) / Number(revenue) : 0,
            page.id,
            projectId,
            page.id
          ).run();
          
          results.push({ project: title, status: 'updated', id: projectId });
        } else {
          // Insert new project
          await env.DB.prepare(`
            INSERT INTO projects (
              id, notion_id, title, project_address, estimated_value,
              profit_margin, status, priority, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'planning', 'medium', datetime('now'), datetime('now'))
          `).bind(
            projectId,
            page.id,
            title,
            address,
            Number(revenue) || 0,
            revenue > 0 ? Number(profit) / Number(revenue) : 0
          ).run();
          
          results.push({ project: title, status: 'created', id: projectId });
        }
      } catch (error) {
        console.error(`Error syncing project from Notion:`, error);
        results.push({
          project: page.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const updated = results.filter(r => r.status === 'updated').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      summary: {
        created,
        updated,
        errors,
        total: results.length
      },
      results
    });

  } catch (error) {
    console.error('Sync Notion to D1 error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync from Notion to D1',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment
