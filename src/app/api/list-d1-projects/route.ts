import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    if (!env.DB) {
      return NextResponse.json(
        { error: 'D1 database not configured' },
        { status: 500 }
      );
    }

    // Get count of projects
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM projects'
    ).first();

    // Get all projects with key fields
    const { results: projects } = await env.DB.prepare(`
      SELECT 
        id,
        title,
        notion_id,
        status,
        priority,
        project_address,
        estimated_value,
        created_at,
        updated_at
      FROM projects
      ORDER BY id
    `).all();

    return NextResponse.json({
      success: true,
      total: countResult?.total || 0,
      projects: projects || [],
      summary: {
        withNotionId: projects?.filter(p => p.notion_id).length || 0,
        withoutNotionId: projects?.filter(p => !p.notion_id).length || 0,
      }
    });

  } catch (error) {
    console.error('Error listing D1 projects:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to list D1 projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
export const runtime = 'edge';
