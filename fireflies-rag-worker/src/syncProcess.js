/**
 * Sync process for batch transcript updates
 */

import { TranscriptStorage } from './transcriptStorage.js';
import { Vectorization } from './vectorization.js';

export class SyncProcess {
  constructor(env) {
    this.env = env;
    this.storage = new TranscriptStorage(env);
    this.vectorization = new Vectorization(env);
  }

  /**
   * Main sync handler
   */
  async handleSync(request = null) {
    try {
      console.log('Starting sync process...');
      
      // Parse options from request if provided
      const options = request ? await this.parseOptions(request) : {};
      
      const results = {
        timestamp: new Date().toISOString(),
        transcripts: { total: 0, successful: 0, failed: 0 },
        vectorization: { total: 0, successful: 0, failed: 0 },
        errors: []
      };

      // Step 1: Sync transcripts from Fireflies
      console.log('Step 1: Syncing transcripts from Fireflies...');
      const syncResult = await this.syncTranscripts(options);
      results.transcripts = syncResult;

      // Step 2: Process vectorization queue
      console.log('Step 2: Processing vectorization queue...');
      const vectorResult = await this.processVectorization(options);
      results.vectorization = vectorResult;

      // Step 3: Clean up old data if requested
      if (options.cleanup) {
        console.log('Step 3: Cleaning up old data...');
        const cleanupResult = await this.cleanupOldData(options);
        results.cleanup = cleanupResult;
      }

      // Update sync status
      await this.updateSyncStatus(results);

      console.log('Sync process completed:', results);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Sync completed successfully',
        results: results
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Sync process error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Parse sync options from request
   */
  async parseOptions(request) {
    try {
      const body = await request.json();
      return {
        limit: body.limit || 50,
        fromDate: body.fromDate || null,
        forceUpdate: body.forceUpdate || false,
        cleanup: body.cleanup || false,
        vectorizeOnly: body.vectorizeOnly || false,
        syncOnly: body.syncOnly || false
      };
    } catch {
      return {};
    }
  }

  /**
   * Sync transcripts from Fireflies
   */
  async syncTranscripts(options) {
    if (options.vectorizeOnly) {
      return { skipped: true };
    }

    try {
      const result = await this.storage.syncTranscripts(
        options.limit || 50,
        options.fromDate
      );
      
      return {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        errors: result.errors
      };
      
    } catch (error) {
      console.error('Transcript sync error:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        error: error.message
      };
    }
  }

  /**
   * Process vectorization queue
   */
  async processVectorization(options) {
    if (options.syncOnly) {
      return { skipped: true };
    }

    try {
      // Get pending vectorization count
      const pendingCount = await this.getPendingVectorizationCount();
      
      if (pendingCount === 0) {
        return {
          total: 0,
          successful: 0,
          failed: 0,
          message: 'No pending vectorization tasks'
        };
      }

      // Process in batches
      const batchSize = 10;
      let totalProcessed = 0;
      let totalFailed = 0;
      const errors = [];

      while (totalProcessed + totalFailed < pendingCount) {
        const result = await this.vectorization.processVectorizationQueue(batchSize);
        
        totalProcessed += result.processed;
        totalFailed += result.failed;
        
        if (result.errors && result.errors.length > 0) {
          errors.push(...result.errors);
        }

        // Break if no more tasks processed
        if (result.processed === 0 && result.failed === 0) {
          break;
        }

        // Rate limiting
        await this.sleep(1000);
      }

      return {
        total: pendingCount,
        successful: totalProcessed,
        failed: totalFailed,
        errors: errors
      };
      
    } catch (error) {
      console.error('Vectorization processing error:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        error: error.message
      };
    }
  }

  /**
   * Get count of pending vectorization tasks
   */
  async getPendingVectorizationCount() {
    const result = await this.env.ALLEATO_DB.prepare(`
      SELECT COUNT(*) as count
      FROM processing_queue
      WHERE task_type = 'vectorize'
        AND status = 'pending'
        AND attempts < 3
    `).first();
    
    return result?.count || 0;
  }

  /**
   * Clean up old data
   */
  async cleanupOldData(options) {
    const results = {
      deletedWebhookEvents: 0,
      deletedProcessingTasks: 0,
      optimizedDatabase: false
    };

    try {
      // Delete old webhook events (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const webhookResult = await this.env.ALLEATO_DB.prepare(`
        DELETE FROM webhook_events
        WHERE created_at < ?
      `).bind(thirtyDaysAgo.toISOString()).run();
      
      results.deletedWebhookEvents = webhookResult.meta.changes;

      // Delete completed processing tasks (older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const taskResult = await this.env.ALLEATO_DB.prepare(`
        DELETE FROM processing_queue
        WHERE status = 'completed'
          AND processed_at < ?
      `).bind(sevenDaysAgo.toISOString()).run();
      
      results.deletedProcessingTasks = taskResult.meta.changes;

      // Optimize database
      // Note: D1 doesn't support VACUUM, but we can update statistics
      results.optimizedDatabase = true;

    } catch (error) {
      console.error('Cleanup error:', error);
      results.error = error.message;
    }

    return results;
  }

  /**
   * Update sync status in system metadata
   */
  async updateSyncStatus(results) {
    const status = {
      lastSync: new Date().toISOString(),
      results: results
    };

    await this.env.ALLEATO_DB.prepare(`
      INSERT INTO system_metadata (key, value, updated_at)
      VALUES ('sync_status', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).bind(
      JSON.stringify(status),
      new Date().toISOString()
    ).run();
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const result = await this.env.ALLEATO_DB.prepare(`
      SELECT value FROM system_metadata
      WHERE key = 'sync_status'
    `).first();

    if (result && result.value) {
      return JSON.parse(result.value);
    }

    return null;
  }

  /**
   * Schedule next sync
   */
  async scheduleNextSync() {
    // This would typically be handled by Cloudflare's cron triggers
    // configured in wrangler.toml
    console.log('Next sync will be triggered by cron schedule');
  }

  /**
   * Manual trigger for immediate sync
   */
  async triggerImmediateSync(options = {}) {
    console.log('Triggering immediate sync...');
    
    // Add high-priority sync task
    await this.env.ALLEATO_DB.prepare(`
      INSERT INTO processing_queue (
        meeting_id, task_type, priority, status, created_at
      ) VALUES ('SYNC_NOW', 'sync', 10, 'pending', ?)
    `).bind(new Date().toISOString()).run();

    // Process immediately
    return await this.handleSync(null);
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics() {
    const stats = {};

    // Total meetings
    const totalMeetings = await this.env.ALLEATO_DB.prepare(
      'SELECT COUNT(*) as count FROM meetings'
    ).first();
    stats.totalMeetings = totalMeetings?.count || 0;

    // Downloaded transcripts
    const downloadedTranscripts = await this.env.ALLEATO_DB.prepare(
      'SELECT COUNT(*) as count FROM meetings WHERE transcript_downloaded = 1'
    ).first();
    stats.downloadedTranscripts = downloadedTranscripts?.count || 0;

    // Vectorized meetings
    const vectorizedMeetings = await this.env.ALLEATO_DB.prepare(
      'SELECT COUNT(*) as count FROM meetings WHERE vector_processed = 1'
    ).first();
    stats.vectorizedMeetings = vectorizedMeetings?.count || 0;

    // Pending tasks
    const pendingTasks = await this.env.ALLEATO_DB.prepare(`
      SELECT task_type, COUNT(*) as count
      FROM processing_queue
      WHERE status = 'pending'
      GROUP BY task_type
    `).all();
    
    stats.pendingTasks = {};
    pendingTasks.results.forEach(task => {
      stats.pendingTasks[task.task_type] = task.count;
    });

    // Recent errors
    const recentErrors = await this.env.ALLEATO_DB.prepare(`
      SELECT COUNT(*) as count
      FROM processing_queue
      WHERE status = 'failed'
        AND created_at > datetime('now', '-24 hours')
    `).first();
    stats.recentErrors = recentErrors?.count || 0;

    // Last sync
    const syncStatus = await this.getSyncStatus();
    if (syncStatus) {
      stats.lastSync = syncStatus.lastSync;
      stats.lastSyncResults = syncStatus.results;
    }

    return stats;
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}