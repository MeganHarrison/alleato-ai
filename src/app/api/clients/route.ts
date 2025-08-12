import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    
    if (!env.DB) {
      return NextResponse.json(
        { error: 'D1 database not configured' },
        { status: 500 }
      );
    }

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

    return NextResponse.json({
      success: true,
      clients: clients || []
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch clients',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
