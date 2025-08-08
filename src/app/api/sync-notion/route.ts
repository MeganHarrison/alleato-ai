import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { syncProjectsToNotion } from '@/lib/notion';

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    // Get the projects data from the request body
    const { projects } = await request.json();
    
    if (!projects || !Array.isArray(projects)) {
      return NextResponse.json(
        { error: 'Invalid projects data' },
        { status: 400 }
      );
    }

    // Get Notion credentials from environment
    const notionApiKey = env.NOTION_API_KEY || env.NOTION_INTEGRATION_TOKEN;
    const notionDatabaseId = env.NOTION_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
      return NextResponse.json(
        { error: 'Notion credentials not configured' },
        { status: 500 }
      );
    }

    // Sync projects to Notion
    const results = await syncProjectsToNotion(
      notionApiKey,
      notionDatabaseId,
      projects
    );

    // Count success and errors
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
    console.error('Sync to Notion error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync to Notion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}