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

    // Test insert with explicit values
    const testId = 'test-proj-' + Date.now();
    
    try {
      const result = await env.DB.prepare(`
        INSERT INTO projects (
          id, title, status, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        testId,
        'Test Project from Notion',
        'planning',
        'medium'
      ).run();

      return NextResponse.json({
        success: true,
        message: 'Test project inserted successfully',
        result
      });
    } catch (insertError) {
      // Try to see what columns exist
      const schema = await env.DB.prepare(`
        PRAGMA table_info(projects)
      `).all();

      return NextResponse.json({
        success: false,
        error: 'Insert failed',
        details: insertError instanceof Error ? insertError.message : 'Unknown error',
        tableSchema: schema.results
      });
    }

  } catch (error) {
    console.error('Test D1 insert error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test D1 insert',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
export const runtime = 'edge';
