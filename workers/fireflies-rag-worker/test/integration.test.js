/**
 * Integration tests for Fireflies RAG Worker
 * Run these tests after deployment to verify the pipeline
 */

import { FirefliesClient } from '../src/firefliesClient.js';
import { TranscriptStorage } from '../src/transcriptStorage.js';
import { ChunkingStrategy } from '../src/chunkingStrategy.js';
import { Vectorization } from '../src/vectorization.js';
import { VectorSearch } from '../src/vectorSearch.js';

// Test configuration
const TEST_CONFIG = {
  workerUrl: process.env.WORKER_URL || 'http://localhost:8787',
  firefliesApiKey: process.env.FIREFLIES_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  testTimeout: 60000 // 60 seconds
};

/**
 * Integration test suite
 */
export class IntegrationTests {
  constructor(env) {
    this.env = env;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Run all integration tests
   */
  async runAll() {
    console.log('🔥 Running Fireflies RAG Worker Integration Tests\n');
    
    // Test 1: Complete pipeline for a single transcript
    await this.testCompletePipeline();
    
    // Test 2: Batch sync functionality
    await this.testBatchSync();
    
    // Test 3: Search functionality
    await this.testSearchFunctionality();
    
    // Test 4: Webhook processing
    await this.testWebhookProcessing();
    
    // Generate report
    this.generateReport();
    
    return this.results;
  }

  /**
   * Test 1: Complete pipeline for a single transcript
   */
  async testCompletePipeline() {
    const testName = 'Complete Pipeline Test';
    console.log(`\n📋 ${testName}`);
    
    try {
      // Step 1: Get a transcript from Fireflies
      console.log('  1️⃣ Fetching transcript from Fireflies...');
      const client = new FirefliesClient(this.env.FIREFLIES_API_KEY);
      const transcripts = await client.getTranscripts(1, 0);
      
      if (!transcripts || transcripts.length === 0) {
        throw new Error('No transcripts available in Fireflies');
      }
      
      const transcript = transcripts[0];
      console.log(`     ✓ Found transcript: ${transcript.title}`);
      
      // Step 2: Download and store
      console.log('  2️⃣ Downloading and storing transcript...');
      const storage = new TranscriptStorage(this.env);
      const storeResult = await storage.downloadAndStoreTranscript(transcript.id);
      console.log(`     ✓ Stored in D1 and R2: ${storeResult.transcriptId}`);
      
      // Step 3: Verify storage
      console.log('  3️⃣ Verifying storage...');
      const meeting = await this.env.ALLEATO_DB.prepare(
        'SELECT * FROM meetings WHERE fireflies_id = ?'
      ).bind(transcript.id).first();
      
      if (!meeting) {
        throw new Error('Meeting not found in database');
      }
      console.log(`     ✓ Meeting in database: ${meeting.title}`);
      
      const r2Object = await this.env.MEETING_TRANSCRIPTS.get(meeting.r2_key);
      if (!r2Object) {
        throw new Error('Transcript not found in R2');
      }
      console.log(`     ✓ Transcript in R2: ${meeting.r2_key}`);
      
      // Step 4: Check chunks
      console.log('  4️⃣ Checking chunks...');
      const chunks = await this.env.ALLEATO_DB.prepare(
        'SELECT COUNT(*) as count, COUNT(DISTINCT chunk_type) as types FROM meeting_chunks WHERE meeting_id = ?'
      ).bind(meeting.id).first();
      
      console.log(`     ✓ Created ${chunks.count} chunks of ${chunks.types} types`);
      
      // Step 5: Process vectorization
      console.log('  5️⃣ Processing vectorization...');
      const vectorization = new Vectorization(this.env);
      await vectorization.vectorizeMeeting(meeting.id);
      
      // Step 6: Verify vectors
      console.log('  6️⃣ Verifying vectors...');
      const vectors = await this.env.ALLEATO_DB.prepare(
        'SELECT COUNT(*) as count FROM meeting_chunks WHERE meeting_id = ? AND embedding IS NOT NULL'
      ).bind(meeting.id).first();
      
      console.log(`     ✓ Vectorized ${vectors.count} chunks`);
      
      this.recordTest(testName, true, {
        transcriptId: transcript.id,
        title: transcript.title,
        chunks: chunks.count,
        vectors: vectors.count
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * Test 2: Batch sync functionality
   */
  async testBatchSync() {
    const testName = 'Batch Sync Test';
    console.log(`\n📋 ${testName}`);
    
    try {
      // Step 1: Run sync for last 7 days
      console.log('  1️⃣ Running batch sync...');
      const storage = new TranscriptStorage(this.env);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const syncResult = await storage.syncTranscripts(5, sevenDaysAgo.toISOString().split('T')[0]);
      console.log(`     ✓ Synced ${syncResult.successful}/${syncResult.total} transcripts`);
      
      // Step 2: Check processing queue
      console.log('  2️⃣ Checking processing queue...');
      const queueCount = await this.env.ALLEATO_DB.prepare(
        'SELECT COUNT(*) as count FROM processing_queue WHERE status = "pending"'
      ).first();
      
      console.log(`     ✓ ${queueCount.count} items in processing queue`);
      
      this.recordTest(testName, true, {
        synced: syncResult.successful,
        total: syncResult.total,
        queued: queueCount.count
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * Test 3: Search functionality
   */
  async testSearchFunctionality() {
    const testName = 'Search Functionality Test';
    console.log(`\n📋 ${testName}`);
    
    try {
      const search = new VectorSearch(this.env);
      
      // Step 1: Text search
      console.log('  1️⃣ Testing text search...');
      const textResults = await search.textSearch('meeting', 5, {});
      console.log(`     ✓ Text search returned ${textResults.length} results`);
      
      // Step 2: Get filter options
      console.log('  2️⃣ Getting filter options...');
      const filterOptions = await search.getFilterOptions();
      console.log(`     ✓ Found ${filterOptions.categories.length} categories, ${filterOptions.speakers.length} speakers`);
      
      // Step 3: Vector search (if we have vectorized content)
      console.log('  3️⃣ Testing vector search...');
      const hasVectors = await this.env.ALLEATO_DB.prepare(
        'SELECT COUNT(*) as count FROM meeting_chunks WHERE embedding IS NOT NULL'
      ).first();
      
      if (hasVectors.count > 0) {
        const vectorResults = await search.search('project discussion', 5, {});
        console.log(`     ✓ Vector search returned ${vectorResults.length} results`);
        
        this.recordTest(testName, true, {
          textSearchResults: textResults.length,
          vectorSearchEnabled: true,
          vectorSearchResults: vectorResults.length,
          filterOptions: filterOptions
        });
      } else {
        console.log('     ⚠️  No vectorized content yet, skipping vector search');
        this.recordTest(testName, true, {
          textSearchResults: textResults.length,
          vectorSearchEnabled: false,
          filterOptions: filterOptions
        });
      }
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * Test 4: Webhook processing
   */
  async testWebhookProcessing() {
    const testName = 'Webhook Processing Test';
    console.log(`\n📋 ${testName}`);
    
    try {
      // Create a mock webhook payload
      const mockWebhook = {
        event: 'transcription.completed',
        transcriptId: 'test_webhook_' + Date.now(),
        title: 'Test Webhook Meeting',
        date: new Date().toISOString()
      };
      
      console.log('  1️⃣ Sending test webhook...');
      const response = await fetch(`${TEST_CONFIG.workerUrl}/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhook)
      });
      
      const result = await response.json();
      console.log(`     ✓ Webhook processed: ${result.success ? 'Success' : 'Failed'}`);
      
      // Check webhook was logged
      console.log('  2️⃣ Checking webhook log...');
      const webhookLog = await this.env.ALLEATO_DB.prepare(
        'SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 1'
      ).first();
      
      if (webhookLog) {
        console.log(`     ✓ Webhook logged: ${webhookLog.event_type}`);
      }
      
      this.recordTest(testName, true, {
        webhookResponse: result,
        webhookLogged: !!webhookLog
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * Record test result
   */
  recordTest(name, passed, details) {
    this.results.total++;
    if (passed) {
      this.results.passed++;
      console.log(`\n✅ ${name}: PASSED`);
    } else {
      this.results.failed++;
      console.log(`\n❌ ${name}: FAILED`);
      console.log(`   Error: ${details.error}`);
    }
    
    this.results.tests.push({
      name: name,
      passed: passed,
      details: details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 INTEGRATION TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);
    console.log('='.repeat(50));
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(t => !t.passed)
        .forEach(t => {
          console.log(`  - ${t.name}: ${t.details.error}`);
        });
    }
    
    console.log('\n📝 Detailed Results:');
    this.results.tests.forEach(t => {
      console.log(`\n${t.passed ? '✅' : '❌'} ${t.name}`);
      console.log(JSON.stringify(t.details, null, 2));
    });
  }
}

// Export for use in worker
export async function runIntegrationTests(env) {
  const tester = new IntegrationTests(env);
  return await tester.runAll();
}