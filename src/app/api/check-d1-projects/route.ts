import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    // Check if we have D1 binding
    if (!env.DB) {
      return NextResponse.json(
        { error: 'D1 database not bound to this worker' },
        { status: 500 }
      );
    }

    // Query projects from D1
    const result = await env.DB.prepare(
      `SELECT 
        id,
        title,
        description,
        status,
        project_type,
        project_address,
        estimated_value,
        created_at
      FROM projects
      LIMIT 10`
    ).all();

    return NextResponse.json({
      success: true,
      count: result.results.length,
      projects: result.results,
      meta: result.meta
    });

  } catch (error) {
    console.error('Error querying D1:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to query D1 database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}