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

    // Get table schema
    const schema = await env.DB.prepare(`
      PRAGMA table_info(clients)
    `).all();

    // Get sample data
    const { results: clients } = await env.DB.prepare(`
      SELECT * FROM clients LIMIT 5
    `).all();

    return NextResponse.json({
      success: true,
      schema: schema.results,
      sampleData: clients,
      count: clients?.length || 0
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
export const runtime = 'edge';
