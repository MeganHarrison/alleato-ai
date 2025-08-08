/**
 * Handles storage of transcripts in both R2 and D1
 */

import { FirefliesClient } from './firefliesClient.js';
import { ChunkingStrategy } from './chunkingStrategy.js';

export class TranscriptStorage {
  constructor(env) {
    this.env = env;
    this.firefliesClient = new FirefliesClient(env.FIREFLIES_API_KEY);
    this.chunkingStrategy = new ChunkingStrategy();
  }

  /**
   * Download and store a single transcript
   */
  async downloadAndStoreTranscript(transcriptId) {
    try {
      console.log(`Downloading transcript ${transcriptId}...`);
      
      // 1. Fetch transcript data from Fireflies
      const transcript = await this.firefliesClient.getTranscriptById(transcriptId);
      if (!transcript) {
        throw new Error(`Transcript ${transcriptId} not found`);
      }

      // 2. Format as markdown
      const markdown = this.firefliesClient.formatTranscriptAsMarkdown(transcript);
      
      // 3. Extract metadata
      const metadata = this.firefliesClient.extractMetadata(transcript);
      
      // 4. Store in R2
      const r2Key = await this.storeInR2(transcript.id, markdown);
      
      // 5. Store metadata in D1
      await this.storeMetadataInD1(transcript, metadata, r2Key, markdown);
      
      // 6. Create chunks for vectorization
      const chunks = await this.chunkingStrategy.chunkTranscript(transcript, transcript.id);
      
      // 7. Store chunks in D1
      await this.storeChunksInD1(chunks);
      
      // 8. Add to processing queue for vectorization
      await this.addToProcessingQueue(transcript.id, 'vectorize');
      
      console.log(`Successfully stored transcript ${transcriptId}`);
      return { success: true, transcriptId, chunkCount: chunks.length };
      
    } catch (error) {
      console.error(`Error downloading transcript ${transcriptId}:`, error);
      throw error;
    }
  }

  /**
   * Store transcript markdown in R2 bucket
   */
  async storeInR2(transcriptId, markdown) {
    const key = `transcripts/${transcriptId}.md`;
    
    await this.env.MEETING_TRANSCRIPTS.put(key, markdown, {
      metadata: {
        contentType: 'text/markdown',
        uploadedAt: new Date().toISOString()
      }
    });
    
    return key;
  }

  /**
   * Store meeting metadata in D1
   */
  async storeMetadataInD1(transcript, metadata, r2Key, markdown) {
    const preview = markdown.substring(0, 500);
    
    // Debug logging
    console.log('Storing metadata for transcript:', {
      id: transcript.id,
      title: transcript.title,
      date: transcript.date,
      duration: transcript.duration,
      metadata: metadata
    });
    
    const query = `
      INSERT INTO meetings (
        id, fireflies_id, title, date, date_time, duration,
        organizer_email, attendees, meeting_url,
        category, tags, project, department,
        transcript_downloaded, r2_key, transcript_preview,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(fireflies_id) DO UPDATE SET
        title = excluded.title,
        date = excluded.date,
        date_time = excluded.date_time,
        duration = excluded.duration,
        organizer_email = excluded.organizer_email,
        attendees = excluded.attendees,
        meeting_url = excluded.meeting_url,
        category = excluded.category,
        tags = excluded.tags,
        project = excluded.project,
        department = excluded.department,
        transcript_downloaded = excluded.transcript_downloaded,
        r2_key = excluded.r2_key,
        transcript_preview = excluded.transcript_preview,
        updated_at = excluded.updated_at
    `;
    
    const attendees = JSON.stringify(transcript.participants || []);
    const tags = JSON.stringify(metadata.tags || []);
    const now = new Date().toISOString();
    
    // Convert date from timestamp to ISO string
    const dateTime = new Date(parseInt(transcript.date)).toISOString();
    
    // Ensure all values are defined
    const values = [
      transcript.id,
      transcript.id,
      transcript.title || 'Untitled',
      dateTime, // date
      dateTime, // date_time
      transcript.duration || 0,
      transcript.organizer_email || null,
      attendees,
      transcript.transcript_url || null,
      metadata.category || 'general',
      tags,
      metadata.project || null,
      metadata.department || null,
      1, // transcript_downloaded
      r2Key,
      preview || '',
      now,
      now
    ];
    
    // Debug log values
    console.log('Database values:', values.map((v, i) => `[${i}]: ${v === null ? 'null' : v === undefined ? 'UNDEFINED!' : typeof v}`));
    
    await this.env.ALLEATO_DB.prepare(query).bind(...values).run();
  }

  /**
   * Store chunks in D1
   */
  async storeChunksInD1(chunks) {
    const query = `
      INSERT INTO meeting_chunks (
        id, meeting_id, chunk_index, chunk_type,
        content, speaker, start_time, end_time, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = this.env.ALLEATO_DB.prepare(query);
    const now = new Date().toISOString();
    
    // Batch insert chunks
    const batch = [];
    for (const chunk of chunks) {
      // Ensure all values are defined
      const values = [
        chunk.id,
        chunk.meeting_id,
        chunk.chunk_index || 0,
        chunk.chunk_type || 'unknown',
        chunk.content || '',
        chunk.speaker || null,
        chunk.start_time !== undefined ? chunk.start_time : null,
        chunk.end_time !== undefined ? chunk.end_time : null,
        now
      ];
      
      batch.push(stmt.bind(...values));
    }
    
    await this.env.ALLEATO_DB.batch(batch);
  }

  /**
   * Add task to processing queue
   */
  async addToProcessingQueue(meetingId, taskType, priority = 5) {
    const query = `
      INSERT INTO processing_queue (
        meeting_id, task_type, priority, status, created_at
      ) VALUES (?, ?, ?, 'pending', ?)
    `;
    
    await this.env.ALLEATO_DB.prepare(query).bind(
      meetingId,
      taskType,
      priority,
      new Date().toISOString()
    ).run();
  }

  /**
   * Bulk sync transcripts from Fireflies
   */
  async syncTranscripts(limit = 50, fromDate = null) {
    try {
      console.log(`Starting transcript sync (limit: ${limit}, fromDate: ${fromDate})`);
      
      const results = {
        total: 0,
        successful: 0,
        failed: 0,
        errors: []
      };
      
      // Get existing transcript IDs to avoid duplicates
      const existingIds = await this.getExistingTranscriptIds();
      
      let lastDate = fromDate ? new Date(fromDate) : null;
      const batchLimit = Math.min(limit, 25); // Fireflies recommends max 25 per request
      
      // Fetch transcripts in batches using date-based pagination
      while (results.total < limit) {
        console.log(`Fetching batch with toDate: ${lastDate ? lastDate.toISOString() : 'now'}`);
        
        const transcripts = await this.firefliesClient.getTranscripts(batchLimit, lastDate ? lastDate.toISOString() : null);
        
        if (!transcripts || transcripts.length === 0) {
          console.log('No more transcripts found');
          break;
        }
        
        console.log(`Found ${transcripts.length} transcripts in this batch`);
        
        let earliestDate = null;
        
        for (const transcript of transcripts) {
          // Skip if we already have this transcript
          if (existingIds.has(transcript.id)) {
            console.log(`Transcript ${transcript.id} already exists, skipping`);
            continue;
          }
          
          // Track earliest date for next batch
          const transcriptDate = new Date(parseInt(transcript.date));
          if (!earliestDate || transcriptDate < earliestDate) {
            earliestDate = transcriptDate;
          }
          
          results.total++;
          
          try {
            // Download and store
            await this.downloadAndStoreTranscript(transcript.id);
            results.successful++;
            
            // Rate limiting - avoid hitting API limits
            await this.sleep(1000); // 1 second delay between requests
            
          } catch (error) {
            console.error(`Failed to sync transcript ${transcript.id}:`, error);
            results.failed++;
            results.errors.push({
              transcriptId: transcript.id,
              error: error.message
            });
          }
          
          // Stop if we've reached the limit
          if (results.total >= limit) {
            break;
          }
        }
        
        // Set next batch date (1 second before earliest to avoid duplicates)
        if (earliestDate) {
          lastDate = new Date(earliestDate.getTime() - 1000);
          await this.sleep(1000); // Extra pause between batches
        } else {
          break;
        }
      }
      
      // Update last sync date
      if (results.successful > 0) {
        await this.updateLastSyncDate();
      }
      
      console.log(`Sync completed: ${results.successful} successful, ${results.failed} failed`);
      return results;
      
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  }

  /**
   * Check if transcript already exists
   */
  async transcriptExists(transcriptId) {
    const result = await this.env.ALLEATO_DB.prepare(
      'SELECT 1 FROM meetings WHERE fireflies_id = ? LIMIT 1'
    ).bind(transcriptId).first();
    
    return !!result;
  }

  /**
   * Get last sync date from system metadata
   */
  async getLastSyncDate() {
    const result = await this.env.ALLEATO_DB.prepare(
      'SELECT value FROM system_metadata WHERE key = ?'
    ).bind('last_sync_date').first();
    
    if (result && result.value) {
      return result.value;
    }
    
    // Default to 30 days ago if no sync date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return thirtyDaysAgo.toISOString().split('T')[0];
  }

  /**
   * Update last sync date
   */
  async updateLastSyncDate() {
    const now = new Date().toISOString();
    
    await this.env.ALLEATO_DB.prepare(`
      INSERT INTO system_metadata (key, value, updated_at)
      VALUES ('last_sync_date', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).bind(now.split('T')[0], now).run();
  }

  /**
   * Get transcript from R2
   */
  async getTranscriptFromR2(r2Key) {
    const object = await this.env.MEETING_TRANSCRIPTS.get(r2Key);
    if (!object) {
      throw new Error(`Transcript not found in R2: ${r2Key}`);
    }
    
    return await object.text();
  }

  /**
   * List recent meetings
   */
  async listRecentMeetings(limit = 50, offset = 0) {
    const query = `
      SELECT 
        id, fireflies_id, title, date_time, duration,
        category, tags, project, department,
        transcript_downloaded, vector_processed,
        created_at
      FROM meetings
      ORDER BY date_time DESC
      LIMIT ? OFFSET ?
    `;
    
    const results = await this.env.ALLEATO_DB.prepare(query)
      .bind(limit, offset)
      .all();
    
    // Parse JSON fields
    return results.results.map(meeting => ({
      ...meeting,
      tags: JSON.parse(meeting.tags || '[]'),
      duration_minutes: Math.floor(meeting.duration / 60)
    }));
  }

  /**
   * Get existing transcript IDs to avoid duplicates
   */
  async getExistingTranscriptIds() {
    const results = await this.env.ALLEATO_DB.prepare(
      'SELECT fireflies_id FROM meetings'
    ).all();
    
    return new Set(results.results.map(r => r.fireflies_id));
  }

  /**
   * Sleep helper for rate limiting
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}