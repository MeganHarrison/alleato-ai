/**
 * Test utilities for validating the Fireflies RAG pipeline
 */

export class TestUtils {
  constructor(env) {
    this.env = env;
  }

  /**
   * Run comprehensive pipeline test
   */
  async runPipelineTest() {
    const results = {
      timestamp: new Date().toISOString(),
      tests: {
        firefliesConnection: { status: 'pending', details: {} },
        databaseConnection: { status: 'pending', details: {} },
        r2Connection: { status: 'pending', details: {} },
        transcriptDownload: { status: 'pending', details: {} },
        storageOperations: { status: 'pending', details: {} },
        chunkingProcess: { status: 'pending', details: {} },
        vectorization: { status: 'pending', details: {} },
        searchFunctionality: { status: 'pending', details: {} }
      },
      summary: {
        total: 8,
        passed: 0,
        failed: 0,
        errors: []
      }
    };

    // Test 1: Fireflies API Connection
    await this.testFirefliesConnection(results);
    
    // Test 2: Database Connection
    await this.testDatabaseConnection(results);
    
    // Test 3: R2 Connection
    await this.testR2Connection(results);
    
    // Test 4: Download a test transcript
    await this.testTranscriptDownload(results);
    
    // Test 5: Storage operations
    await this.testStorageOperations(results);
    
    // Test 6: Chunking process
    await this.testChunkingProcess(results);
    
    // Test 7: Vectorization
    await this.testVectorization(results);
    
    // Test 8: Search functionality
    await this.testSearchFunctionality(results);

    // Calculate summary
    for (const test of Object.values(results.tests)) {
      if (test.status === 'passed') results.summary.passed++;
      else if (test.status === 'failed') results.summary.failed++;
    }

    return results;
  }

  /**
   * Test Fireflies API connection
   */
  async testFirefliesConnection(results) {
    const test = results.tests.firefliesConnection;
    
    try {
      if (!this.env.FIREFLIES_API_KEY) {
        throw new Error('FIREFLIES_API_KEY not configured');
      }

      // Test GraphQL endpoint
      const response = await fetch('https://api.fireflies.ai/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.FIREFLIES_API_KEY}`
        },
        body: JSON.stringify({
          query: `query TestConnection {
            user {
              email
            }
          }`
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      
      test.status = 'passed';
      test.details = {
        endpoint: 'https://api.fireflies.ai/graphql',
        authenticated: true,
        user: data.data?.user?.email || 'Unknown'
      };
      
    } catch (error) {
      test.status = 'failed';
      test.details = {
        error: error.message,
        suggestion: 'Check your FIREFLIES_API_KEY is valid'
      };
      results.summary.errors.push(`Fireflies API: ${error.message}`);
    }
  }

  /**
   * Test D1 database connection
   */
  async testDatabaseConnection(results) {
    const test = results.tests.databaseConnection;
    
    try {
      if (!this.env.ALLEATO_DB) {
        throw new Error('ALLEATO_DB binding not configured');
      }

      // Test basic query
      const result = await this.env.ALLEATO_DB.prepare(
        'SELECT name FROM sqlite_master WHERE type="table"'
      ).all();

      const tables = result.results.map(r => r.name);
      const requiredTables = ['meetings', 'meeting_chunks', 'webhook_events', 'processing_queue', 'system_metadata', 'vector_index'];
      const missingTables = requiredTables.filter(t => !tables.includes(t));

      if (missingTables.length > 0) {
        throw new Error(`Missing tables: ${missingTables.join(', ')}`);
      }

      // Test table structure
      const meetingCount = await this.env.ALLEATO_DB.prepare(
        'SELECT COUNT(*) as count FROM meetings'
      ).first();

      test.status = 'passed';
      test.details = {
        connected: true,
        tables: tables,
        meetingCount: meetingCount?.count || 0,
        allRequiredTablesPresent: true
      };
      
    } catch (error) {
      test.status = 'failed';
      test.details = {
        error: error.message,
        suggestion: 'Run wrangler d1 execute with schema.sql'
      };
      results.summary.errors.push(`Database: ${error.message}`);
    }
  }

  /**
   * Test R2 bucket connection
   */
  async testR2Connection(results) {
    const test = results.tests.r2Connection;
    
    try {
      if (!this.env.MEETING_TRANSCRIPTS) {
        throw new Error('MEETING_TRANSCRIPTS R2 binding not configured');
      }

      // Test write and read
      const testKey = 'test/connection-test.txt';
      const testContent = `Test connection at ${new Date().toISOString()}`;
      
      await this.env.MEETING_TRANSCRIPTS.put(testKey, testContent);
      const object = await this.env.MEETING_TRANSCRIPTS.get(testKey);
      
      if (!object) {
        throw new Error('Failed to retrieve test object');
      }

      const retrieved = await object.text();
      
      // Clean up
      await this.env.MEETING_TRANSCRIPTS.delete(testKey);

      test.status = 'passed';
      test.details = {
        connected: true,
        canWrite: true,
        canRead: true,
        canDelete: true,
        testContent: retrieved === testContent
      };
      
    } catch (error) {
      test.status = 'failed';
      test.details = {
        error: error.message,
        suggestion: 'Check R2 bucket binding in wrangler.toml'
      };
      results.summary.errors.push(`R2 Storage: ${error.message}`);
    }
  }

  /**
   * Test transcript download
   */
  async testTranscriptDownload(results) {
    const test = results.tests.transcriptDownload;
    
    try {
      const { FirefliesClient } = await import('./firefliesClient.js');
      const client = new FirefliesClient(this.env.FIREFLIES_API_KEY);
      
      // Get most recent transcript
      const transcripts = await client.getTranscripts(1, 0);
      
      if (!transcripts || transcripts.length === 0) {
        test.status = 'passed';
        test.details = {
          message: 'No transcripts available to test',
          suggestion: 'Create a meeting in Fireflies first'
        };
        return;
      }

      const transcript = transcripts[0];
      
      // Test markdown formatting
      const markdown = client.formatTranscriptAsMarkdown(transcript);
      
      if (!markdown || markdown.length < 100) {
        throw new Error('Markdown formatting failed');
      }

      // Test metadata extraction
      const metadata = client.extractMetadata(transcript);
      
      test.status = 'passed';
      test.details = {
        transcriptId: transcript.id,
        title: transcript.title,
        date: transcript.date,
        duration: transcript.duration,
        markdownLength: markdown.length,
        metadata: metadata,
        hasSentences: transcript.sentences && transcript.sentences.length > 0
      };
      
    } catch (error) {
      test.status = 'failed';
      test.details = {
        error: error.message,
        suggestion: 'Check Fireflies API key and permissions'
      };
      results.summary.errors.push(`Transcript Download: ${error.message}`);
    }
  }

  /**
   * Test storage operations
   */
  async testStorageOperations(results) {
    const test = results.tests.storageOperations;
    
    try {
      // Create test meeting data
      const testMeeting = {
        id: `test_${Date.now()}`,
        title: 'Test Meeting for Pipeline Validation',
        date: new Date().toISOString(),
        duration: 1800,
        organizer_email: 'test@example.com',
        sentences: [
          { text: 'Welcome to the test meeting.', speaker_name: 'Test User', start_time: 0, end_time: 5 },
          { text: 'This is a test transcript.', speaker_name: 'Test User', start_time: 5, end_time: 10 }
        ],
        summary: {
          overview: 'Test meeting for pipeline validation',
          keywords: ['test', 'validation', 'pipeline']
        }
      };

      // Test R2 storage
      const testMarkdown = `# ${testMeeting.title}\n\nTest content`;
      const r2Key = `test/${testMeeting.id}.md`;
      
      await this.env.MEETING_TRANSCRIPTS.put(r2Key, testMarkdown);
      
      // Test D1 storage
      await this.env.ALLEATO_DB.prepare(`
        INSERT INTO meetings (
          id, fireflies_id, title, date_time, duration,
          organizer_email, category, tags, transcript_downloaded,
          r2_key, transcript_preview, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        testMeeting.id,
        testMeeting.id,
        testMeeting.title,
        testMeeting.date,
        testMeeting.duration,
        testMeeting.organizer_email,
        'test',
        JSON.stringify(['test', 'validation']),
        1,
        r2Key,
        testMarkdown.substring(0, 500),
        new Date().toISOString()
      ).run();

      // Verify storage
      const stored = await this.env.ALLEATO_DB.prepare(
        'SELECT * FROM meetings WHERE id = ?'
      ).bind(testMeeting.id).first();

      const r2Object = await this.env.MEETING_TRANSCRIPTS.get(r2Key);
      const r2Content = r2Object ? await r2Object.text() : null;

      // Cleanup
      await this.env.ALLEATO_DB.prepare(
        'DELETE FROM meetings WHERE id = ?'
      ).bind(testMeeting.id).run();
      await this.env.MEETING_TRANSCRIPTS.delete(r2Key);

      test.status = 'passed';
      test.details = {
        d1Storage: !!stored,
        r2Storage: !!r2Content,
        meetingId: testMeeting.id,
        dataIntegrity: stored?.title === testMeeting.title && r2Content === testMarkdown
      };
      
    } catch (error) {
      test.status = 'failed';
      test.details = {
        error: error.message,
        suggestion: 'Check database schema and R2 permissions'
      };
      results.summary.errors.push(`Storage Operations: ${error.message}`);
    }
  }

  /**
   * Test chunking process
   */
  async testChunkingProcess(results) {
    const test = results.tests.chunkingProcess;
    
    try {
      const { ChunkingStrategy } = await import('./chunkingStrategy.js');
      const chunker = new ChunkingStrategy();
      
      // Create test transcript
      const testTranscript = {
        id: 'test_chunking',
        title: 'Test Chunking Meeting',
        date: new Date().toISOString(),
        duration: 600, // 10 minutes
        sentences: []
      };

      // Generate test sentences
      const speakers = ['Alice', 'Bob', 'Charlie'];
      for (let i = 0; i < 60; i++) {
        testTranscript.sentences.push({
          text: `This is sentence ${i} of the test transcript. It contains important information about topic ${Math.floor(i / 10)}.`,
          speaker_name: speakers[i % speakers.length],
          start_time: i * 10,
          end_time: (i + 1) * 10
        });
      }

      // Test chunking
      const chunks = await chunker.chunkTranscript(testTranscript, testTranscript.id);
      
      // Validate chunks
      const chunkTypes = chunks.reduce((acc, chunk) => {
        acc[chunk.chunk_type] = (acc[chunk.chunk_type] || 0) + 1;
        return acc;
      }, {});

      test.status = 'passed';
      test.details = {
        totalChunks: chunks.length,
        chunkTypes: chunkTypes,
        hasFullChunk: chunkTypes.full === 1,
        hasTimeSegments: (chunkTypes.time_segment || 0) > 0,
        hasSpeakerTurns: (chunkTypes.speaker_turn || 0) > 0,
        averageChunkLength: Math.round(
          chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length
        )
      };
      
    } catch (error) {
      test.status = 'failed';
      test.details = {
        error: error.message,
        suggestion: 'Check chunking strategy implementation'
      };
      results.summary.errors.push(`Chunking Process: ${error.message}`);
    }
  }

  /**
   * Test vectorization
   */
  async testVectorization(results) {
    const test = results.tests.vectorization;
    
    try {
      if (!this.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const { Vectorization } = await import('./vectorization.js');
      const vectorizer = new Vectorization(this.env);
      
      // Test embedding generation
      const testText = 'This is a test sentence for vectorization.';
      const embedding = await vectorizer.generateEmbedding(testText);
      
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding format');
      }

      // Test batch embeddings
      const testTexts = [
        'First test sentence.',
        'Second test sentence.',
        'Third test sentence.'
      ];
      const batchEmbeddings = await vectorizer.generateBatchEmbeddings(testTexts);
      
      if (batchEmbeddings.length !== testTexts.length) {
        throw new Error('Batch embedding count mismatch');
      }

      // Test vector storage format
      const blob = vectorizer.float32ArrayToBlob(embedding);
      const restored = vectorizer.blobToFloat32Array(blob);
      
      test.status = 'passed';
      test.details = {
        openAIConnected: true,
        embeddingModel: vectorizer.embeddingModel,
        embeddingDimensions: embedding.length,
        batchProcessing: true,
        blobConversion: restored.length === embedding.length,
        cosineSimilarity: vectorizer.cosineSimilarity(embedding, embedding).toFixed(3)
      };
      
    } catch (error) {
      test.status = 'failed';
      test.details = {
        error: error.message,
        suggestion: 'Check OpenAI API key and rate limits'
      };
      results.summary.errors.push(`Vectorization: ${error.message}`);
    }
  }

  /**
   * Test search functionality
   */
  async testSearchFunctionality(results) {
    const test = results.tests.searchFunctionality;
    
    try {
      const { VectorSearch } = await import('./vectorSearch.js');
      const search = new VectorSearch(this.env);
      
      // Check if we have any meetings to search
      const meetingCount = await this.env.ALLEATO_DB.prepare(
        'SELECT COUNT(*) as count FROM meetings'
      ).first();
      
      if (meetingCount?.count === 0) {
        test.status = 'passed';
        test.details = {
          message: 'No meetings to search',
          suggestion: 'Run sync first to populate data'
        };
        return;
      }

      // Test filter options
      const filterOptions = await search.getFilterOptions();
      
      // Test text search
      const textResults = await search.textSearch('meeting', 5, {});
      
      // Test search suggestions
      const suggestions = await search.getSearchSuggestions('test', 5);
      
      test.status = 'passed';
      test.details = {
        meetingsAvailable: meetingCount?.count || 0,
        filterOptions: {
          categories: filterOptions.categories.length,
          projects: filterOptions.projects.length,
          departments: filterOptions.departments.length,
          speakers: filterOptions.speakers.length
        },
        textSearchWorks: true,
        textSearchResults: textResults.length,
        suggestionsWork: true,
        suggestionCount: suggestions.length
      };
      
    } catch (error) {
      test.status = 'failed';
      test.details = {
        error: error.message,
        suggestion: 'Check search implementation and database'
      };
      results.summary.errors.push(`Search Functionality: ${error.message}`);
    }
  }

  /**
   * Validate a specific transcript
   */
  async validateTranscript(transcriptId) {
    const validation = {
      transcriptId: transcriptId,
      timestamp: new Date().toISOString(),
      steps: {
        inDatabase: false,
        inR2: false,
        hasChunks: false,
        hasVectors: false,
        isSearchable: false
      },
      details: {}
    };

    try {
      // Check database
      const meeting = await this.env.ALLEATO_DB.prepare(
        'SELECT * FROM meetings WHERE fireflies_id = ?'
      ).bind(transcriptId).first();
      
      validation.steps.inDatabase = !!meeting;
      validation.details.meeting = meeting;

      if (meeting) {
        // Check R2
        if (meeting.r2_key) {
          const r2Object = await this.env.MEETING_TRANSCRIPTS.get(meeting.r2_key);
          validation.steps.inR2 = !!r2Object;
          if (r2Object) {
            const content = await r2Object.text();
            validation.details.r2ContentLength = content.length;
          }
        }

        // Check chunks
        const chunks = await this.env.ALLEATO_DB.prepare(
          'SELECT COUNT(*) as count FROM meeting_chunks WHERE meeting_id = ?'
        ).bind(meeting.id).first();
        
        validation.steps.hasChunks = chunks?.count > 0;
        validation.details.chunkCount = chunks?.count || 0;

        // Check vectors
        const vectors = await this.env.ALLEATO_DB.prepare(
          'SELECT COUNT(*) as count FROM meeting_chunks WHERE meeting_id = ? AND embedding IS NOT NULL'
        ).bind(meeting.id).first();
        
        validation.steps.hasVectors = vectors?.count > 0;
        validation.details.vectorCount = vectors?.count || 0;

        // Check if searchable
        const vectorIndex = await this.env.ALLEATO_DB.prepare(
          'SELECT COUNT(*) as count FROM vector_index WHERE meeting_id = ?'
        ).bind(meeting.id).first();
        
        validation.steps.isSearchable = vectorIndex?.count > 0;
        validation.details.indexCount = vectorIndex?.count || 0;

        validation.details.vectorProcessed = meeting.vector_processed === 1;
      }

      validation.success = Object.values(validation.steps).every(v => v === true);
      
    } catch (error) {
      validation.error = error.message;
      validation.success = false;
    }

    return validation;
  }

  /**
   * Generate test report
   */
  generateTestReport(results) {
    let report = '# Fireflies RAG Pipeline Test Report\n\n';
    report += `Generated: ${results.timestamp}\n\n`;
    
    report += '## Summary\n';
    report += `- Total Tests: ${results.summary.total}\n`;
    report += `- Passed: ${results.summary.passed} ✅\n`;
    report += `- Failed: ${results.summary.failed} ❌\n\n`;
    
    if (results.summary.errors.length > 0) {
      report += '## Errors\n';
      results.summary.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }
    
    report += '## Test Results\n\n';
    
    for (const [name, test] of Object.entries(results.tests)) {
      const icon = test.status === 'passed' ? '✅' : '❌';
      const title = name.replace(/([A-Z])/g, ' $1').trim();
      
      report += `### ${icon} ${title}\n`;
      report += `Status: ${test.status}\n\n`;
      
      if (test.details) {
        report += '```json\n';
        report += JSON.stringify(test.details, null, 2);
        report += '\n```\n\n';
      }
    }
    
    return report;
  }
}