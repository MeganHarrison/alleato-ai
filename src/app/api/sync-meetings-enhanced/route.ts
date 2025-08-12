import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { SmartChunkingService } from '@/lib/services/smart-chunking';
import type { SmartChunk, ExtractedEntity, ChunkRelationship } from '@/lib/services/smart-chunking';

interface MeetingMetadata {
  id: string;
  title: string;
  date: string;
  duration: number;
  attendees: string[];
  project_id?: string;
  client_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get Cloudflare context
    const { env } = await getCloudflareContext({ async: true });
    
    // Initialize the smart chunking service
    const chunkingService = new SmartChunkingService(
      {
        maxTokens: 1500,
        minTokens: 100,
        overlapTokens: 200,
        targetTokens: 1000,
      },
      env.OPENAI_API_KEY // Optional: for AI-enhanced entity extraction
    );
    
    // 1. Fetch meetings from Fireflies API
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
              summary
              action_items
              tasks
              questions
            }
          }
        `,
        variables: {
          limit: 50
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
    
    // Get existing meetings from D1 to avoid duplicates
    const existingMeetings = new Set<string>();
    try {
      const db = env.DB;
      const existing = await db.prepare('SELECT id FROM meetings').all();
      existing.results.forEach((row: any) => existingMeetings.add(row.id));
    } catch (error) {
      console.warn('Could not fetch existing meetings:', error);
    }

    // Process each meeting with smart chunking
    const syncResults = await Promise.allSettled(
      firefliesData.data.transcripts.map(async (transcript: any) => {
        // Skip if already processed
        if (existingMeetings.has(transcript.id)) {
          console.log(`Skipping existing meeting: ${transcript.id}`);
          return { id: transcript.id, skipped: true };
        }
        
        // Extract metadata
        const metadata: MeetingMetadata = {
          id: transcript.id,
          title: transcript.title,
          date: transcript.date,
          duration: transcript.duration || 0,
          attendees: transcript.meeting_attendees?.map((a: any) => a.displayName) || [],
          project_id: await extractProjectId(transcript.title, env),
          client_id: await extractClientId(transcript.title, env),
        };
        
        // Convert transcript to format for chunking
        const transcriptContent = formatTranscriptForChunking(transcript);
        
        // Process with smart chunking
        const chunkingResult = await chunkingService.processContent(
          transcriptContent,
          'meeting'
        );
        
        // Store in D1 database
        await storeMeetingWithChunks(
          metadata,
          transcript,
          chunkingResult.chunks,
          chunkingResult.relationships,
          chunkingResult.metadata,
          env
        );
        
        // Store in R2 for backup (optional)
        const markdownContent = convertToEnhancedMarkdown(transcript, chunkingResult);
        const filename = `${new Date(transcript.date).toISOString().split('T')[0]} - ${transcript.title.replace(/[^a-zA-Z0-9\s-]/g, '').trim()}.md`;
        
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${env.R2_BUCKET_NAME}/objects/${filename}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'text/markdown',
            },
            body: markdownContent
          }
        );
        
        return {
          id: transcript.id,
          title: transcript.title,
          chunks: chunkingResult.chunks.length,
          entities: chunkingResult.metadata.extractedEntities.size,
          relationships: chunkingResult.relationships.length,
        };
      })
    );

    // Gather results
    const successful = syncResults.filter(r => r.status === 'fulfilled' && !(r as any).value.skipped);
    const failed = syncResults.filter(r => r.status === 'rejected');
    const skipped = syncResults.filter(r => r.status === 'fulfilled' && (r as any).value.skipped);
    
    // Trigger vectorization for new chunks
    if (successful.length > 0) {
      try {
        await triggerVectorization(successful.map(r => (r as any).value.id), env);
      } catch (error) {
        console.warn('Vectorization trigger failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      processed: successful.length,
      skipped: skipped.length,
      failed: failed.length,
      details: successful.map(r => (r as any).value),
      errors: failed.map(r => (r as any).reason?.message || 'Unknown error'),
    });

  } catch (error) {
    console.error('Enhanced sync error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync meetings with enhanced chunking',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Helper function to format transcript for chunking
function formatTranscriptForChunking(transcript: any): string {
  const lines: string[] = [];
  
  if (transcript.sentences && Array.isArray(transcript.sentences)) {
    let currentSpeaker = '';
    let currentText: string[] = [];
    
    for (const sentence of transcript.sentences) {
      const speaker = sentence.speaker_name || 'Unknown';
      
      if (speaker !== currentSpeaker) {
        if (currentText.length > 0) {
          const timestamp = sentence.start_time 
            ? `[${Math.floor(sentence.start_time / 60)}:${String(Math.floor(sentence.start_time % 60)).padStart(2, '0')}]`
            : '';
          lines.push(`${timestamp} ${currentSpeaker}: ${currentText.join(' ')}`);
        }
        currentSpeaker = speaker;
        currentText = [sentence.text];
      } else {
        currentText.push(sentence.text);
      }
    }
    
    // Add last speaker's text
    if (currentText.length > 0) {
      lines.push(`${currentSpeaker}: ${currentText.join(' ')}`);
    }
  }
  
  // Add summary and action items if available
  if (transcript.summary) {
    lines.push('\\n## Summary\\n' + transcript.summary);
  }
  
  if (transcript.action_items && transcript.action_items.length > 0) {
    lines.push('\\n## Action Items\\n');
    transcript.action_items.forEach((item: any) => {
      lines.push(`- ${item}`);
    });
  }
  
  return lines.join('\\n');
}

// Store meeting with chunks in D1
async function storeMeetingWithChunks(
  metadata: MeetingMetadata,
  originalTranscript: any,
  chunks: SmartChunk[],
  relationships: ChunkRelationship[],
  documentMetadata: any,
  env: any
) {
  const db = env.DB;
  
  // Start transaction
  const statements = [];
  
  // 1. Insert meeting
  statements.push(
    db.prepare(`
      INSERT INTO meetings (
        id, title, date, duration, project_id, client_id,
        participants, meeting_type, status, priority,
        extracted_entities, timeline, speakers, chunk_count, total_tokens,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      metadata.id,
      metadata.title,
      metadata.date,
      metadata.duration,
      metadata.project_id || null,
      metadata.client_id || null,
      JSON.stringify(metadata.attendees),
      'team_meeting', // Default, can be enhanced with classification
      'vectorized',
      'medium',
      JSON.stringify(Array.from(documentMetadata.extractedEntities.entries())),
      JSON.stringify(documentMetadata.timeline || []),
      JSON.stringify(documentMetadata.speakers || []),
      chunks.length,
      documentMetadata.totalTokens,
    )
  );
  
  // 2. Insert chunks
  for (const chunk of chunks) {
    statements.push(
      db.prepare(`
        INSERT INTO meeting_chunks (
          id, meeting_id, content, position, chunk_type,
          speaker, start_time, end_time,
          parent_chunk_id, previous_chunk_id, next_chunk_id,
          topics, sentiment, importance, context_before, context_after, token_count,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        chunk.id,
        metadata.id,
        chunk.content,
        chunk.position,
        chunk.type,
        chunk.speaker || null,
        chunk.startTime || null,
        chunk.endTime || null,
        chunk.parentChunkId || null,
        chunk.previousChunkId || null,
        chunk.nextChunkId || null,
        JSON.stringify(chunk.topics),
        chunk.sentiment || null,
        chunk.importance,
        chunk.contextBefore || null,
        chunk.contextAfter || null,
        chunk.tokenCount
      )
    );
    
    // 3. Insert entities for this chunk
    for (const entity of chunk.entities) {
      statements.push(
        db.prepare(`
          INSERT INTO extracted_entities (
            chunk_id, meeting_id, entity_type, entity_value,
            confidence, context, position, metadata,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          chunk.id,
          metadata.id,
          entity.type,
          entity.value,
          entity.confidence,
          entity.context || null,
          entity.position || null,
          JSON.stringify({ /* additional metadata */ })
        )
      );
    }
  }
  
  // 4. Insert chunk relationships
  for (const relationship of relationships) {
    statements.push(
      db.prepare(`
        INSERT INTO chunk_relationships (
          from_chunk_id, to_chunk_id, relationship_type, strength,
          created_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(
        relationship.fromChunkId,
        relationship.toChunkId,
        relationship.type,
        relationship.strength
      )
    );
  }
  
  // 5. Insert timeline events
  if (documentMetadata.timeline) {
    for (const event of documentMetadata.timeline) {
      statements.push(
        db.prepare(`
          INSERT INTO timeline_events (
            meeting_id, chunk_id, event_type, event_description,
            event_timestamp, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          metadata.id,
          event.chunkId,
          event.type,
          event.description,
          event.timestamp,
          'pending'
        )
      );
    }
  }
  
  // Execute all statements in batch
  await db.batch(statements);
}

// Extract project ID from title
async function extractProjectId(title: string, env: any): Promise<string | undefined> {
  try {
    const db = env.DB;
    
    // Try to match project by patterns in title
    const patterns = [
      title.match(/project\s+(\w+)/i)?.[1],
      title.match(/(\w+)\s+project/i)?.[1],
      title.match(/P-(\d+)/)?.[0], // Project number pattern
    ].filter(Boolean);
    
    if (patterns.length > 0) {
      for (const pattern of patterns) {
        const result = await db.prepare(
          'SELECT id FROM projects WHERE title LIKE ? OR job_number = ? LIMIT 1'
        ).bind(`%${pattern}%`, pattern).first();
        
        if (result) {
          return result.id as string;
        }
      }
    }
  } catch (error) {
    console.error('Error extracting project ID:', error);
  }
  
  return undefined;
}

// Extract client ID from title
async function extractClientId(title: string, env: any): Promise<string | undefined> {
  try {
    const db = env.DB;
    
    // Extract potential client names from title
    const words = title.split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        const result = await db.prepare(
          'SELECT id FROM clients WHERE company_name LIKE ? LIMIT 1'
        ).bind(`%${word}%`).first();
        
        if (result) {
          return result.id as string;
        }
      }
    }
  } catch (error) {
    console.error('Error extracting client ID:', error);
  }
  
  return undefined;
}

// Convert to enhanced markdown with chunk metadata
function convertToEnhancedMarkdown(transcript: any, chunkingResult: any): string {
  const date = new Date(transcript.date);
  const attendees = transcript.meeting_attendees?.map((a: any) => a.displayName).join(', ') || 'Unknown';
  const duration = transcript.duration ? `${Math.round(transcript.duration / 60)} minutes` : 'Unknown';
  
  // Extract key entities
  const entities = chunkingResult.metadata.extractedEntities;
  const people = entities.get('person') || [];
  const projects = entities.get('project') || [];
  const decisions = entities.get('decision') || [];
  const actionItems = entities.get('action_item') || [];
  const risks = entities.get('risk') || [];
  
  return `---
title: ${transcript.title}
date: ${date.toISOString()}
type: meeting-transcript-enhanced
duration: ${duration}
attendees: ${attendees}
chunk_count: ${chunkingResult.chunks.length}
total_tokens: ${chunkingResult.metadata.totalTokens}
---

# ${transcript.title}

## Meeting Overview
- **Date:** ${date.toLocaleDateString()}
- **Duration:** ${duration}
- **Attendees:** ${attendees}
- **Total Chunks:** ${chunkingResult.chunks.length}
- **Extracted Entities:** ${Array.from(entities.values()).flat().length}

## Key Entities Extracted

### People (${people.length})
${people.slice(0, 10).map((p: ExtractedEntity) => `- ${p.value} (confidence: ${(p.confidence * 100).toFixed(0)}%)`).join('\\n')}

### Projects (${projects.length})
${projects.slice(0, 10).map((p: ExtractedEntity) => `- ${p.value} (confidence: ${(p.confidence * 100).toFixed(0)}%)`).join('\\n')}

### Decisions (${decisions.length})
${decisions.slice(0, 10).map((d: ExtractedEntity) => `- ${d.value}`).join('\\n')}

### Action Items (${actionItems.length})
${actionItems.slice(0, 10).map((a: ExtractedEntity) => `- ${a.value}`).join('\\n')}

### Risks (${risks.length})
${risks.slice(0, 10).map((r: ExtractedEntity) => `- ${r.value}`).join('\\n')}

## Timeline
${chunkingResult.metadata.timeline?.map((event: any) => 
  `- **${event.type}** at ${event.timestamp}s: ${event.description}`
).join('\\n') || 'No timeline events extracted'}

## Smart Chunks

${chunkingResult.chunks.slice(0, 5).map((chunk: SmartChunk) => `
### Chunk ${chunk.position + 1} (${chunk.type})
- **Speaker:** ${chunk.speaker || 'N/A'}
- **Importance:** ${(chunk.importance * 100).toFixed(0)}%
- **Sentiment:** ${chunk.sentiment || 'neutral'}
- **Topics:** ${chunk.topics.join(', ')}
- **Entities:** ${chunk.entities.length} extracted

**Content Preview:**
> ${chunk.content.substring(0, 200)}...
`).join('\\n')}

## Original Transcript

${transcript.sentences?.map((sentence: any) => {
  const timestamp = sentence.start_time 
    ? `[${Math.floor(sentence.start_time / 60)}:${String(Math.floor(sentence.start_time % 60)).padStart(2, '0')}]`
    : '';
  return `${timestamp} **${sentence.speaker_name}:** ${sentence.text}`;
}).join('\\n\\n') || 'No transcript content available.'}

---
**Processing Details:**
- Chunking Method: Smart Speaker-Aware with Entity Extraction
- Relationships Identified: ${chunkingResult.relationships.length}
- Processing Date: ${new Date().toISOString()}
`;
}

// Trigger vectorization for new chunks
async function triggerVectorization(meetingIds: string[], env: any) {
  try {
    const response = await fetch(`${env.VECTORIZATION_WORKER_URL}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.VECTORIZATION_API_KEY}`,
      },
      body: JSON.stringify({
        meeting_ids: meetingIds,
        process_type: 'smart_chunks',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Vectorization trigger failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Vectorization trigger error:', error);
    throw error;
  }
}