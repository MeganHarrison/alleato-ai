import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request: NextRequest) {
  try {
    // Get Cloudflare context
    const { env } = await getCloudflareContext({ async: true });
    
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
            }
          }
        `,
        variables: {
          limit: 50 // Increased limit to catch more meetings
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
    
    // First, get existing files to avoid duplicates
    const existingFiles = new Set<string>();
    try {
      const listResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${env.R2_BUCKET_NAME}/objects?per_page=1000`,
        {
          headers: {
            'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          },
        }
      );
      
      if (listResponse.ok) {
        const listData = await listResponse.json();
        if (Array.isArray(listData.result)) {
          listData.result.forEach((obj: any) => {
            existingFiles.add(obj.key);
          });
        }
      }
    } catch (error) {
      console.warn('Could not fetch existing files:', error);
    }

    // 2. Convert to markdown and upload to R2 bucket
    const syncResults = await Promise.allSettled(
      firefliesData.data.transcripts.map(async (transcript: any) => {
        const markdownContent = convertToMarkdown(transcript);
        
        // Format date as YYYY-MM-DD
        const date = new Date(transcript.date);
        const dateStr = date.toISOString().split('T')[0];
        
        // Clean title for filename (remove special characters)
        const cleanTitle = transcript.title
          .replace(/[^a-zA-Z0-9\s-]/g, '')
          .trim();
        
        // Create filename with format: YYYY-MM-DD - Title.md
        const filename = `${dateStr} - ${cleanTitle}.md`;
        
        // Skip if file already exists
        if (existingFiles.has(filename)) {
          console.log(`Skipping existing file: ${filename}`);
          return { id: transcript.id, filename, skipped: true };
        }
        
        console.log(`Uploading meeting: ${filename}`);
        
        // Upload to R2 bucket (no meetings folder)
        const uploadResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${env.R2_BUCKET_NAME}/objects/${filename}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'text/markdown',
          },
          body: markdownContent
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Failed to upload meeting ${filename}: ${uploadResponse.status} - ${errorText}`);
        }

        return { id: transcript.id, filename, title: transcript.title };
      })
    );

    // Count successful uploads and gather details
    const successfulUploads = syncResults.filter(result => result.status === 'fulfilled');
    const failedUploads = syncResults.filter(result => result.status === 'rejected');
    
    // Get successful filenames for logging
    const uploadedFiles = successfulUploads
      .map(result => (result as PromiseFulfilledResult<any>).value)
      .filter(file => !file.skipped);
    
    const skippedFiles = successfulUploads
      .map(result => (result as PromiseFulfilledResult<any>).value)
      .filter(file => file.skipped).length;

    // 3. Trigger AutoRAG sync to reindex new content
    try {
      await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/autorag/rags/alleato-docs/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        }
      });
    } catch (syncError) {
      console.warn('AutoRAG sync trigger failed:', syncError);
      // Don't fail the entire operation if sync trigger fails
    }

    return NextResponse.json({ 
      count: uploadedFiles.length,
      failed: failedUploads.length,
      skipped: skippedFiles,
      uploadedFiles: uploadedFiles,
      message: `Successfully synced ${uploadedFiles.length} new meetings${skippedFiles > 0 ? ` (${skippedFiles} already existed)` : ''}${failedUploads.length > 0 ? ` (${failedUploads.length} failed)` : ''}`,
      errors: failedUploads.map(f => (f as PromiseRejectedResult).reason?.message || 'Unknown error')
    });

  } catch (error) {
    console.error('Sync meetings error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to sync meetings',
      details: error instanceof Error ? error.message : 'Unknown error',
      count: 0
    }, { status: 200 }); // Return 200 so frontend handles gracefully
  }
}

function convertToMarkdown(transcript: any): string {
  // Add structured metadata at the top
  const metadata = {
    project: extractProjectFromTitle(transcript.title),
    date: transcript.date,
    type: 'meeting-transcript',
    priority: 'high',
    department: 'operations',
    status: 'completed',
    tags: `meeting,transcript,${transcript.title.toLowerCase().replace(/\s+/g, '-')}`
  };
  
  const attendees = transcript.meeting_attendees?.map((a: any) => a.displayName).join(', ') || 'Unknown';
  const duration = transcript.duration ? `${Math.round(transcript.duration / 60)} minutes` : 'Unknown';
  
  return `---
title: ${transcript.title}
project: ${metadata.project}
date: ${new Date(transcript.date).toISOString()}
type: ${metadata.type}
priority: ${metadata.priority}
department: ${metadata.department}
status: ${metadata.status}
tags: ${metadata.tags}
duration: ${duration}
attendees: ${attendees}
---

# ${transcript.title}

**Project:** ${metadata.project}
**Date:** ${new Date(transcript.date).toLocaleDateString()}
**Type:** Meeting Transcript
**Priority:** ${metadata.priority}

## Meeting Details
- **Duration:** ${duration}
- **Attendees:** ${attendees}
- **Meeting ID:** ${transcript.id}

## Transcript

${transcript.sentences?.map((sentence: any, index: number) => {
  const timestamp = sentence.start_time ? `[${Math.floor(sentence.start_time / 60)}:${String(Math.floor(sentence.start_time % 60)).padStart(2, '0')}]` : '';
  return `${timestamp} **${sentence.speaker_name}:** ${sentence.text}`;
}).join('\n\n') || 'No transcript content available.'}

---

**Document Metadata:**
- **Project:** ${metadata.project}
- **Department:** ${metadata.department}
- **Status:** ${metadata.status}
- **Tags:** ${metadata.tags}
- **Indexed:** ${new Date().toISOString()}
`;
}

// Helper function to extract project from meeting title
function extractProjectFromTitle(title: string): string {
  // Smart project extraction based on common patterns
  const projectPatterns = [
    /project\s+(\w+)/i,
    /(\w+)\s+project/i,
    /(\w+)\s+meeting/i,
    /weekly\s+(\w+)/i,
    /(\w+)\s+standup/i,
    /(\w+)\s+review/i,
    /port\s+collective/i,
    /collective/i
  ];
  
  for (const pattern of projectPatterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }
  
  return 'general';
}
// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment
