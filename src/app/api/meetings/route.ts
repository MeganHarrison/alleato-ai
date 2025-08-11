import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    // Check if D1 database binding exists
    if (!env.DB) {
      return NextResponse.json(
        { error: "Database not configured. Please ensure DB binding is set in wrangler.jsonc" },
        { status: 503 }
      );
    }

    // Query meetings from D1 database
    const query = `
      SELECT 
        id,
        fireflies_id,
        title,
        date_time,
        duration,
        organizer_email,
        attendees,
        meeting_url,
        category,
        project,
        department,
        transcript_downloaded,
        vector_processed,
        processed_at,
        r2_key,
        transcript_preview,
        created_at,
        updated_at
      FROM meetings
      ORDER BY date_time DESC
      LIMIT 100
    `;

    const result = await env.DB.prepare(query).all();

    if (!result.success) {
      throw new Error("Failed to fetch meetings from database");
    }

    // Format the response
    return NextResponse.json({
      meetings: result.results || [],
      count: result.results?.length || 0,
      success: true
    });

  } catch (error) {
    console.error("Error fetching meetings:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch meetings",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false
      },
      { status: 500 }
    );
  }
}