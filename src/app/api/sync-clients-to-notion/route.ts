import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getNotionClient } from '@/lib/notion';

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    // Check if D1 is available
    if (!env.DB) {
      return NextResponse.json(
        { error: 'D1 database not configured' },
        { status: 500 }
      );
    }

    // Get Notion credentials
    const notionApiKey = env.NOTION_API_KEY;
    const notionClientsDatabaseId = env.NOTION_CLIENTS_DATABASE_ID || '248ee3c6-d996-807a-bd99-d2b2202b7ba2';

    if (!notionApiKey) {
      return NextResponse.json(
        { error: 'Notion API key not configured' },
        { status: 500 }
      );
    }

    const notion = getNotionClient(notionApiKey);
    const results = [];

    // Get all clients from D1
    const { results: clients } = await env.DB.prepare(`
      SELECT 
        id,
        company,
        address,
        website,
        status,
        notion_id
      FROM clients
      ORDER BY company
    `).all();

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No clients found in D1 database',
        summary: { created: 0, updated: 0, errors: 0, total: 0 },
        results: []
      });
    }

    // Get existing Notion pages
    const existingPages = await notion.databases.query({
      database_id: notionClientsDatabaseId,
    });

    // Create a map of existing pages by name
    const existingMap = new Map();
    for (const page of existingPages.results) {
      if ('properties' in page) {
        const name = page.properties['Name']?.title?.[0]?.plain_text;
        if (name) {
          existingMap.set(name.toLowerCase(), page.id);
        }
      }
    }

    // Sync each client
    for (const client of clients) {
      try {
        const properties = {
          'Name': {
            title: [
              {
                text: {
                  content: client.company || 'Unnamed Client',
                },
              },
            ],
          },
        };

        const clientNameLower = (client.company || '').toLowerCase();
        
        if (client.notion_id || existingMap.has(clientNameLower)) {
          // Update existing page
          const pageId = client.notion_id || existingMap.get(clientNameLower);
          const response = await notion.pages.update({
            page_id: pageId,
            properties,
          });
          
          // Update D1 with Notion ID if it wasn't set
          if (!client.notion_id && response.id) {
            await env.DB.prepare(
              'UPDATE clients SET notion_id = ? WHERE id = ?'
            ).bind(response.id, client.id).run();
          }
          
          results.push({ client: client.company, status: 'updated', pageId: response.id });
        } else {
          // Create new page
          const response = await notion.pages.create({
            parent: { database_id: notionClientsDatabaseId },
            properties,
          });
          
          // Update D1 with Notion ID
          await env.DB.prepare(
            'UPDATE clients SET notion_id = ? WHERE id = ?'
          ).bind(response.id, client.id).run();
          
          results.push({ client: client.company, status: 'created', pageId: response.id });
        }
      } catch (error) {
        console.error(`Error syncing client "${client.company}":`, error);
        results.push({
          client: client.company,
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
    console.error('Sync clients to Notion error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync clients to Notion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment
