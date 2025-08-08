/**
 * Webhook handler for Fireflies real-time updates
 */

import { TranscriptStorage } from './transcriptStorage.js';

export class WebhookHandler {
  constructor(env) {
    this.env = env;
    this.storage = new TranscriptStorage(env);
  }

  /**
   * Handle incoming webhook from Fireflies
   */
  async handleWebhook(request) {
    try {
      // Verify webhook signature if provided
      const signature = request.headers.get('X-Fireflies-Signature');
      if (signature && this.env.FIREFLIES_WEBHOOK_SECRET) {
        const isValid = await this.verifyWebhookSignature(request, signature);
        if (!isValid) {
          console.error('Invalid webhook signature');
          return new Response('Unauthorized', { status: 401 });
        }
      }

      // Parse webhook payload
      const payload = await request.json();
      console.log('Webhook received:', JSON.stringify(payload, null, 2));

      // Log webhook event
      await this.logWebhookEvent(payload);

      // Process based on event type
      const result = await this.processWebhookEvent(payload);

      return new Response(JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        result: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(request, signature) {
    const payload = await request.text();
    const secret = this.env.FIREFLIES_WEBHOOK_SECRET;
    
    // Create HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    
    return computedSignature === signature;
  }

  /**
   * Log webhook event to database
   */
  async logWebhookEvent(payload) {
    const query = `
      INSERT INTO webhook_events (
        event_type, fireflies_id, payload, created_at
      ) VALUES (?, ?, ?, ?)
    `;
    
    const eventType = payload.event || payload.type || 'unknown';
    const firefliesId = payload.transcriptId || payload.meeting_id || null;
    
    await this.env.ALLEATO_DB.prepare(query).bind(
      eventType,
      firefliesId,
      JSON.stringify(payload),
      new Date().toISOString()
    ).run();
  }

  /**
   * Process webhook event based on type
   */
  async processWebhookEvent(payload) {
    const eventType = payload.event || payload.type || 'unknown';
    
    switch (eventType) {
      case 'transcription.completed':
      case 'meeting.transcribed':
        return await this.handleTranscriptionCompleted(payload);
        
      case 'meeting.started':
        return await this.handleMeetingStarted(payload);
        
      case 'meeting.ended':
        return await this.handleMeetingEnded(payload);
        
      case 'transcript.updated':
        return await this.handleTranscriptUpdated(payload);
        
      default:
        console.log(`Unknown webhook event type: ${eventType}`);
        return { processed: false, reason: 'Unknown event type' };
    }
  }

  /**
   * Handle transcription completed event
   */
  async handleTranscriptionCompleted(payload) {
    const transcriptId = payload.transcriptId || payload.meeting_id;
    
    if (!transcriptId) {
      throw new Error('No transcript ID found in webhook payload');
    }
    
    console.log(`Processing new transcription: ${transcriptId}`);
    
    try {
      // Download and store the transcript with high priority
      const result = await this.storage.downloadAndStoreTranscript(transcriptId);
      
      // Update processing queue with high priority for new transcripts
      await this.storage.addToProcessingQueue(transcriptId, 'vectorize', 10);
      
      return {
        processed: true,
        transcriptId: transcriptId,
        ...result
      };
      
    } catch (error) {
      // If download fails, add to retry queue
      await this.addToRetryQueue(transcriptId, error.message);
      throw error;
    }
  }

  /**
   * Handle meeting started event
   */
  async handleMeetingStarted(payload) {
    console.log('Meeting started:', payload);
    
    // Optionally pre-create meeting record
    if (payload.meeting_id && payload.title) {
      const query = `
        INSERT OR IGNORE INTO meetings (
          id, fireflies_id, title, date_time, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `;
      
      await this.env.ALLEATO_DB.prepare(query).bind(
        payload.meeting_id,
        payload.meeting_id,
        payload.title,
        payload.start_time || new Date().toISOString(),
        new Date().toISOString()
      ).run();
    }
    
    return { processed: true, action: 'meeting_recorded' };
  }

  /**
   * Handle meeting ended event
   */
  async handleMeetingEnded(payload) {
    console.log('Meeting ended:', payload);
    
    // Update meeting duration if available
    if (payload.meeting_id && payload.duration) {
      await this.env.ALLEATO_DB.prepare(`
        UPDATE meetings
        SET duration = ?
        WHERE fireflies_id = ?
      `).bind(payload.duration, payload.meeting_id).run();
    }
    
    return { processed: true, action: 'meeting_updated' };
  }

  /**
   * Handle transcript updated event
   */
  async handleTranscriptUpdated(payload) {
    const transcriptId = payload.transcriptId || payload.meeting_id;
    
    if (!transcriptId) {
      return { processed: false, reason: 'No transcript ID' };
    }
    
    console.log(`Transcript updated: ${transcriptId}`);
    
    // Re-download and update the transcript
    try {
      const result = await this.storage.downloadAndStoreTranscript(transcriptId);
      
      // Mark for re-vectorization
      await this.storage.addToProcessingQueue(transcriptId, 'vectorize', 8);
      
      return {
        processed: true,
        action: 'transcript_updated',
        ...result
      };
      
    } catch (error) {
      console.error(`Failed to update transcript ${transcriptId}:`, error);
      return { processed: false, error: error.message };
    }
  }

  /**
   * Add failed webhook to retry queue
   */
  async addToRetryQueue(transcriptId, errorMessage) {
    const query = `
      INSERT INTO processing_queue (
        meeting_id, task_type, priority, status, 
        error_message, created_at
      ) VALUES (?, 'webhook_retry', 7, 'pending', ?, ?)
    `;
    
    await this.env.ALLEATO_DB.prepare(query).bind(
      transcriptId,
      errorMessage,
      new Date().toISOString()
    ).run();
  }

  /**
   * Process retry queue for failed webhooks
   */
  async processRetryQueue(limit = 5) {
    const tasks = await this.env.ALLEATO_DB.prepare(`
      SELECT id, meeting_id
      FROM processing_queue
      WHERE task_type = 'webhook_retry'
        AND status = 'pending'
        AND attempts < 3
      ORDER BY created_at ASC
      LIMIT ?
    `).bind(limit).all();
    
    const results = {
      processed: 0,
      failed: 0
    };
    
    for (const task of tasks.results) {
      try {
        await this.storage.downloadAndStoreTranscript(task.meeting_id);
        
        await this.env.ALLEATO_DB.prepare(`
          UPDATE processing_queue
          SET status = 'completed', processed_at = ?
          WHERE id = ?
        `).bind(new Date().toISOString(), task.id).run();
        
        results.processed++;
        
      } catch (error) {
        await this.env.ALLEATO_DB.prepare(`
          UPDATE processing_queue
          SET attempts = attempts + 1, error_message = ?
          WHERE id = ?
        `).bind(error.message, task.id).run();
        
        results.failed++;
      }
    }
    
    return results;
  }
}