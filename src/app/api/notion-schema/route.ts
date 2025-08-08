import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getNotionClient } from '@/lib/notion';

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    // Get Notion credentials from environment
    const notionApiKey = env.NOTION_API_KEY || env.NOTION_INTEGRATION_TOKEN;
    const notionDatabaseId = env.NOTION_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
      return NextResponse.json(
        { error: 'Notion credentials not configured' },
        { status: 500 }
      );
    }

    const notion = getNotionClient(notionApiKey);
    
    // Get database schema
    const database = await notion.databases.retrieve({
      database_id: notionDatabaseId,
    });

    // Extract property names and types
    const properties = Object.entries(database.properties).map(([name, prop]) => ({
      name,
      type: prop.type,
      ...(prop.type === 'select' && 'options' in prop ? { options: prop.options } : {}),
      ...(prop.type === 'status' && 'options' in prop ? { options: prop.options } : {}),
      ...(prop.type === 'status' && 'groups' in prop ? { groups: prop.groups } : {}),
    }));

    return NextResponse.json({
      success: true,
      databaseId: database.id,
      title: database.title,
      properties,
    });

  } catch (error) {
    console.error('Get Notion schema error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get Notion schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}