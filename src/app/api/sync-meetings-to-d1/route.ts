import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    if (!env.DB) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Fetch meetings from Fireflies API
    const firefliesResponse = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.FIREFLIES_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetTranscripts($limit: Int) {
            transcripts(limit: $limit) {
              id
              title
              date
              duration
              organizer_email
              meeting_attendees {
                displayName
                email
              }
              transcript_url
              sentences {
                text
                speaker_name
                start_time
              }
            }
          }
        `,
        variables: {
          limit: 20
        }
      })
    });

    if (!firefliesResponse.ok) {
      throw new Error(`Fireflies API error: ${firefliesResponse.status}`);
    }

    const firefliesData = await firefliesResponse.json();
    
    if (!firefliesData.data?.transcripts) {
      throw new Error('No transcripts found in Fireflies response');
    }

    const transcripts = firefliesData.data.transcripts;
    let syncedCount = 0;
    let errors = [];

    // Process each transcript
    for (const transcript of transcripts) {
      try {
        // Check if meeting already exists
        const existing = await env.DB.prepare(
          'SELECT id FROM meetings WHERE fireflies_id = ?'
        ).bind(transcript.id).first();

        if (!existing) {
          // Extract meeting data
          const attendees = transcript.meeting_attendees?.map((a: any) => a.email || a.displayName) || [];
          const transcriptPreview = transcript.sentences?.slice(0, 3)
            .map((s: any) => `${s.speaker_name}: ${s.text}`)
            .join(' ')
            .substring(0, 500) || '';

          // Generate a unique ID
          const id = `meeting-${transcript.id}`;
          
          // Insert into database
          await env.DB.prepare(`
            INSERT INTO meetings (
              id,
              fireflies_id,
              title,
              date_time,
              duration,
              organizer_email,
              attendees,
              meeting_url,
              transcript_preview,
              transcript_downloaded,
              vector_processed,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            id,
            transcript.id,
            transcript.title || 'Untitled Meeting',
            new Date(transcript.date).toISOString(),
            Math.round(transcript.duration * 60), // Convert minutes to seconds
            transcript.organizer_email || attendees[0] || 'unknown@example.com',
            JSON.stringify(attendees),
            transcript.transcript_url || null,
            transcriptPreview,
            1, // Mark as downloaded since we have the content
            0  // Not yet vectorized
          ).run();
          
          syncedCount++;
        }
      } catch (error) {
        errors.push({
          transcript: transcript.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: syncedCount,
      total: transcripts.length,
      skipped: transcripts.length - syncedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully synced ${syncedCount} meetings to D1 database`
    });

  } catch (error) {
    console.error('Sync to D1 error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to sync meetings to D1',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment
