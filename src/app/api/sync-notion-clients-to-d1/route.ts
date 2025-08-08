import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getNotionClient } from '@/lib/notion';

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    // Get Notion credentials
    const notionApiKey = env.NOTION_API_KEY;
    const notionClientsDatabaseId = env.NOTION_CLIENTS_DATABASE_ID || '248ee3c6-d996-807a-bd99-d2b2202b7ba2';

    if (!notionApiKey) {
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

    // Fetch all clients from Notion database
    let allClients = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: notionClientsDatabaseId,
        start_cursor: nextCursor,
        page_size: 100,
      });

      allClients = allClients.concat(response.results);
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
    }

    console.log(`Found ${allClients.length} clients in Notion`);

    for (const page of allClients) {
      if (!('properties' in page)) continue;
      
      try {
        const props = page.properties as any;
        
        // Extract data from Notion properties
        const companyName = props['Name']?.title?.[0]?.plain_text || 'Unnamed Client';
        const notionId = page.id;
        
        // Check if client exists
        const existing = await env.DB.prepare(
          'SELECT id FROM clients WHERE notion_id = ? OR company = ?'
        ).bind(notionId, companyName).first();

        if (existing) {
          // Update existing client
          await env.DB.prepare(`
            UPDATE clients 
            SET 
              company = ?,
              notion_id = ?
            WHERE notion_id = ? OR company = ?
          `).bind(
            companyName,
            notionId,
            notionId,
            companyName
          ).run();
          
          results.push({ client: companyName, status: 'updated', id: existing.id });
        } else {
          // Get next ID
          const maxIdResult = await env.DB.prepare(
            'SELECT MAX(id) as max_id FROM clients'
          ).first();
          const nextId = (maxIdResult?.max_id || 0) + 1;
          
          // Insert new client
          await env.DB.prepare(`
            INSERT INTO clients (
              id, notion_id, company, status
            ) VALUES (?, ?, ?, 'active')
          `).bind(
            nextId,
            notionId,
            companyName
          ).run();
          
          results.push({ client: companyName, status: 'created', id: nextId });
        }
      } catch (error) {
        console.error(`Error syncing client from Notion:`, error);
        results.push({
          client: page.id,
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
    console.error('Sync Notion clients to D1 error:', error);
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