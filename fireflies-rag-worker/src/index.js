import { WebhookHandler } from './webhookHandler.js';
import { SyncProcess } from './syncProcess.js';
import { VectorSearch } from './vectorSearch.js';
import { TranscriptStorage } from './transcriptStorage.js';
import { Vectorization } from './vectorization.js';
import { TestUtils } from './testUtils.js';

export default {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const path = url.pathname;
  
      // Add detailed logging
      console.log('Request received:', { path, url: url.toString() });
  
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };
  
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
  
      try {
        switch (path) {
          case '/':
            return handleDashboard(env, corsHeaders);
          case '/test':
            return handleTest(env, corsHeaders);
          case '/debug':
            return handleDebug(env, corsHeaders);
          case '/webhook':
            return handleWebhook(request, env, corsHeaders);
          case '/sync':
            return handleSync(env, corsHeaders);
          case '/analytics':
            return handleAnalytics(env, corsHeaders);
          case '/search':
            return handleSearch(request, env, corsHeaders);
          case '/vector-search':
            return handleVectorSearch(request, env, corsHeaders);
          case '/process':
            return handleProcess(request, env, corsHeaders);
          case '/meetings':
            return handleMeetings(request, env, corsHeaders);
          case '/filter-options':
            return handleFilterOptions(env, corsHeaders);
          case '/test-pipeline':
            return handleTestPipeline(env, corsHeaders);
          case '/validate-transcript':
            return handleValidateTranscript(request, env, corsHeaders);
          case '/test-single-transcript':
            return handleTestSingleTranscript(request, env, corsHeaders);
          default:
            return new Response(`Path not found: ${path}`, { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
            });
        }
      } catch (error) {
        console.error('Worker error:', error);
        return new Response(JSON.stringify({ 
          error: error.message,
          stack: error.stack,
          path: path,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    },
  
    async scheduled(event, env, ctx) {
      console.log('Scheduled event triggered');
      ctx.waitUntil(syncFirefliesData(env));
    }
  };
  
  async function handleDebug(env, corsHeaders) {
    try {
      const debugInfo = {
        timestamp: new Date().toISOString(),
        env_keys: Object.keys(env || {}),
        database_connected: !!env.ALLEATO_DB,
        r2_connected: !!env.MEETING_TRANSCRIPTS,
        fireflies_key_set: !!env.FIREFLIES_API_KEY,
        openai_key_set: !!env.OPENAI_API_KEY,
        status: 'DEBUG_INFO'
      };
  
      // Try database connection
      if (env.ALLEATO_DB) {
        try {
          const result = await env.ALLEATO_DB.prepare('SELECT COUNT(*) as count FROM meetings').first();
          debugInfo.database_query_result = result;
          debugInfo.meeting_count = result?.count || 0;
        } catch (dbError) {
          debugInfo.database_error = dbError.message;
        }
      }
  
      return new Response(JSON.stringify(debugInfo, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message,
        status: 'DEBUG_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  async function handleTest(env, corsHeaders) {
    try {
      const stats = await getSystemStats(env);
      return new Response(JSON.stringify({
        message: '🔥 Fireflies RAG Worker is ACTUALLY operational!',
        stats: stats,
        timestamp: new Date().toISOString(),
        database: env.ALLEATO_DB ? 'Connected' : 'Not Connected',
        r2: env.MEETING_TRANSCRIPTS ? 'Connected' : 'Not Connected',
        status: 'WORKING'
      }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message,
        status: 'ERROR',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  async function handleDashboard(env, corsHeaders) {
    try {
      const stats = await getSystemStats(env);
      const storage = new TranscriptStorage(env);
      const recentMeetings = await storage.listRecentMeetings(10);
      
      const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🔥 Alleato Fireflies RAG Pipeline</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
  </head>
  <body class="bg-gray-900 text-white min-h-screen">
      <div x-data="dashboard()" class="container mx-auto px-6 py-8">
          <div class="mb-8">
              <h1 class="text-4xl font-bold mb-2">🔥 Alleato Intelligence Engine</h1>
              <p class="text-gray-400">Transform Your ${stats.totalMeetings} Meetings Into Strategic Intelligence</p>
              <p class="text-green-400 mt-2">✅ System Operational - Database ${env.ALLEATO_DB ? 'Connected' : 'Not Connected'}</p>
          </div>
  
          <!-- Stats Grid -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div class="bg-gray-800 p-6 rounded-lg border border-blue-500">
                  <h3 class="text-lg font-semibold mb-2">📊 Total Meetings</h3>
                  <p class="text-3xl font-bold text-blue-400">${stats.totalMeetings}</p>
                  <p class="text-sm text-gray-400 mt-1">Ready for vectorization</p>
              </div>
              <div class="bg-gray-800 p-6 rounded-lg border border-green-500">
                  <h3 class="text-lg font-semibold mb-2">🤖 Vectorized</h3>
                  <p class="text-3xl font-bold text-green-400">${stats.vectorizedMeetings}</p>
                  <p class="text-sm text-gray-400 mt-1">AI search ready</p>
              </div>
              <div class="bg-gray-800 p-6 rounded-lg border border-purple-500">
                  <h3 class="text-lg font-semibold mb-2">📝 Total Chunks</h3>
                  <p class="text-3xl font-bold text-purple-400">${stats.totalChunks}</p>
                  <p class="text-sm text-gray-400 mt-1">Searchable segments</p>
              </div>
              <div class="bg-gray-800 p-6 rounded-lg border border-yellow-500">
                  <h3 class="text-lg font-semibold mb-2">⚡ Status</h3>
                  <p class="text-3xl font-bold text-green-400">LIVE</p>
                  <p class="text-sm text-gray-400 mt-1">All systems operational</p>
              </div>
          </div>
  
          <!-- Action Buttons -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <button @click="testSystem()" :disabled="loading" class="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 p-4 rounded-lg font-semibold transition-colors">
                  <span x-show="!loading">🧪 Test System</span>
                  <span x-show="loading">⏳ Testing...</span>
              </button>
              <button @click="syncData()" :disabled="loading" class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-4 rounded-lg font-semibold transition-colors">
                  <span x-show="!loading">🔄 Sync Fireflies Now</span>
                  <span x-show="loading">⏳ Syncing...</span>
              </button>
              <button @click="processVectors()" :disabled="loading" class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 p-4 rounded-lg font-semibold transition-colors">
                  <span x-show="!loading">⚡ Start Vectorization</span>
                  <span x-show="loading">🤖 Processing...</span>
              </button>
          </div>
  
          <!-- Recent Meetings Table -->
          <div class="bg-gray-800 p-6 rounded-lg mb-8">
              <div class="flex justify-between items-center mb-4">
                  <h3 class="text-xl font-semibold">📅 Recent Meetings</h3>
                  <button @click="loadMeetings()" class="text-blue-400 hover:text-blue-300">
                      Refresh
                  </button>
              </div>
              <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                      <thead>
                          <tr class="border-b border-gray-700">
                              <th class="text-left py-2 px-4">Date</th>
                              <th class="text-left py-2 px-4">Title</th>
                              <th class="text-left py-2 px-4">Category</th>
                              <th class="text-left py-2 px-4">Project</th>
                              <th class="text-left py-2 px-4">Duration</th>
                              <th class="text-left py-2 px-4">Status</th>
                              <th class="text-left py-2 px-4">Tags</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${recentMeetings.map(meeting => `
                          <tr class="border-b border-gray-700 hover:bg-gray-700">
                              <td class="py-2 px-4">${new Date(meeting.date_time).toLocaleDateString()}</td>
                              <td class="py-2 px-4 max-w-xs truncate">${meeting.title}</td>
                              <td class="py-2 px-4">
                                  <span class="px-2 py-1 bg-gray-700 rounded text-xs">
                                      ${meeting.category || 'general'}
                                  </span>
                              </td>
                              <td class="py-2 px-4">${meeting.project || '-'}</td>
                              <td class="py-2 px-4">${meeting.duration_minutes}m</td>
                              <td class="py-2 px-4">
                                  ${meeting.vector_processed ? 
                                    '<span class="text-green-400">✅ Vectorized</span>' : 
                                    '<span class="text-yellow-400">⏳ Pending</span>'
                                  }
                              </td>
                              <td class="py-2 px-4">
                                  ${meeting.tags.slice(0, 3).map(tag => 
                                    `<span class="inline-block px-2 py-1 bg-blue-900 rounded text-xs mr-1">${tag}</span>`
                                  ).join('')}
                              </td>
                          </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              <div class="mt-4 text-center">
                  <button @click="viewAllMeetings()" class="text-blue-400 hover:text-blue-300">
                      View All Meetings →
                  </button>
              </div>
          </div>
  
          <!-- Search Section -->
          <div class="bg-gray-800 p-6 rounded-lg mb-8">
              <h3 class="text-xl font-semibold mb-4">🔍 Search Meetings</h3>
              <div class="flex gap-4 mb-4">
                  <input 
                      type="text" 
                      x-model="searchQuery"
                      @keyup.enter="performSearch()"
                      placeholder="Search in meeting transcripts..."
                      class="flex-1 px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                  <button 
                      @click="performSearch()" 
                      :disabled="!searchQuery || searching"
                      class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-semibold transition-colors"
                  >
                      <span x-show="!searching">Search</span>
                      <span x-show="searching">Searching...</span>
                  </button>
                  <button 
                      @click="performVectorSearch()" 
                      :disabled="!searchQuery || searching"
                      class="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded font-semibold transition-colors"
                  >
                      <span x-show="!searching">AI Search</span>
                      <span x-show="searching">Searching...</span>
                  </button>
              </div>
              <div x-show="searchResults.length > 0" class="mt-4">
                  <h4 class="font-semibold mb-2">Search Results:</h4>
                  <div class="space-y-2 max-h-60 overflow-y-auto">
                      <template x-for="result in searchResults" :key="result.chunk.id">
                          <div class="p-3 bg-gray-700 rounded">
                              <div class="font-semibold text-sm" x-text="result.meeting.title"></div>
                              <div class="text-xs text-gray-400" x-text="new Date(result.meeting.date).toLocaleDateString()"></div>
                              <div class="mt-1 text-sm" x-html="result.chunk.content.substring(0, 200) + '...'"></div>
                          </div>
                      </template>
                  </div>
              </div>
          </div>
  
          <!-- API Endpoints -->
          <div class="bg-gray-800 p-6 rounded-lg">
              <h3 class="text-xl font-semibold mb-4">🔗 API Endpoints</h3>
              <div class="space-y-2 text-sm font-mono">
                  <div>GET <a href="/test" class="text-blue-400 underline">/test</a> - System health check</div>
                  <div>GET <a href="/debug" class="text-yellow-400 underline">/debug</a> - Debug information</div>
                  <div>POST <span class="text-green-400">/webhook</span> - Fireflies webhook</div>
                  <div>POST <span class="text-yellow-400">/sync</span> - Manual sync</div>
                  <div>POST <span class="text-purple-400">/process</span> - Start vectorization</div>
                  <div>GET <span class="text-cyan-400">/analytics</span> - Usage stats</div>
                  <div>POST <span class="text-blue-400">/search</span> - Text search</div>
                  <div>POST <span class="text-purple-400">/vector-search</span> - AI-powered search</div>
                  <div>GET <span class="text-green-400">/meetings</span> - List meetings</div>
                  <div>GET <a href="/test-pipeline" class="text-red-400 underline">/test-pipeline</a> - Run full pipeline tests</div>
                  <div>GET <a href="/test-single-transcript" class="text-red-400 underline">/test-single-transcript</a> - Test single transcript</div>
                  <div>GET <span class="text-red-400">/validate-transcript?id=XXX</span> - Validate specific transcript</div>
              </div>
          </div>
  
          <div x-show="message" :class="messageType === 'error' ? 'bg-red-600' : 'bg-green-600'" class="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg">
              <p x-text="message"></p>
          </div>
      </div>
  
      <script>
          function dashboard() {
              return {
                  loading: false,
                  searching: false,
                  message: '',
                  messageType: 'success',
                  searchQuery: '',
                  searchResults: [],
                  async testSystem() {
                      this.loading = true;
                      try {
                          const response = await fetch('/test');
                          const result = await response.json();
                          this.showMessage('✅ System test passed: ' + result.message);
                      } catch (error) {
                          this.showMessage('❌ System test failed: ' + error.message, 'error');
                      }
                      this.loading = false;
                  },
                  async syncData() {
                      this.loading = true;
                      try {
                          const response = await fetch('/sync', { method: 'POST' });
                          const result = await response.json();
                          this.showMessage(result.message || 'Sync started successfully');
                          setTimeout(() => location.reload(), 3000);
                      } catch (error) {
                          this.showMessage('Sync failed: ' + error.message, 'error');
                      }
                      this.loading = false;
                  },
                  async processVectors() {
                      this.loading = true;
                      try {
                          const response = await fetch('/process', { method: 'POST' });
                          const result = await response.json();
                          this.showMessage(result.message || 'Vectorization started');
                      } catch (error) {
                          this.showMessage('Vectorization failed: ' + error.message, 'error');
                      }
                      this.loading = false;
                  },
                  async performSearch() {
                      if (!this.searchQuery) return;
                      this.searching = true;
                      try {
                          const response = await fetch('/search', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ query: this.searchQuery, limit: 10 })
                          });
                          const result = await response.json();
                          this.searchResults = result.results || [];
                          this.showMessage(\`Found \${this.searchResults.length} results\`);
                      } catch (error) {
                          this.showMessage('Search failed: ' + error.message, 'error');
                      }
                      this.searching = false;
                  },
                  async performVectorSearch() {
                      if (!this.searchQuery) return;
                      this.searching = true;
                      try {
                          const response = await fetch('/vector-search', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ query: this.searchQuery, limit: 10 })
                          });
                          const result = await response.json();
                          this.searchResults = result.results || [];
                          this.showMessage(\`Found \${this.searchResults.length} AI-matched results\`);
                      } catch (error) {
                          this.showMessage('AI search failed: ' + error.message, 'error');
                      }
                      this.searching = false;
                  },
                  async loadMeetings() {
                      location.reload();
                  },
                  viewAllMeetings() {
                      // In production, this would navigate to a dedicated meetings page
                      window.location.href = '/meetings';
                  },
                  showMessage(msg, type = 'success') {
                      this.message = msg;
                      this.messageType = type;
                      setTimeout(() => this.message = '', 5000);
                  }
              }
          }
      </script>
  </body>
  </html>`;
  
      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      });
    } catch (error) {
      return new Response(`Dashboard Error: ${error.message}`, {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }
  }
  
  async function getSystemStats(env) {
    try {
      if (!env.ALLEATO_DB) {
        return { totalMeetings: 0, vectorizedMeetings: 0, totalChunks: 0, error: 'Database not connected' };
      }
  
      const totalMeetings = await env.ALLEATO_DB.prepare('SELECT COUNT(*) as count FROM meetings').first();
      const vectorizedMeetings = await env.ALLEATO_DB.prepare('SELECT COUNT(*) as count FROM meetings WHERE vector_processed = 1').first();
      const totalChunks = await env.ALLEATO_DB.prepare('SELECT COUNT(*) as count FROM meeting_chunks').first();
      
      return {
        totalMeetings: totalMeetings?.count || 0,
        vectorizedMeetings: vectorizedMeetings?.count || 0,
        totalChunks: totalChunks?.count || 0
      };
    } catch (error) {
      console.log('Stats error:', error);
      return { totalMeetings: 0, vectorizedMeetings: 0, totalChunks: 0, error: error.message };
    }
  }
  
  // Updated handler functions
  async function handleWebhook(request, env, corsHeaders) {
    const handler = new WebhookHandler(env);
    const response = await handler.handleWebhook(request);
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
  
  async function handleSync(env, corsHeaders) {
    const syncProcess = new SyncProcess(env);
    const response = await syncProcess.handleSync();
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
  
  async function handleAnalytics(env, corsHeaders) {
    const syncProcess = new SyncProcess(env);
    const stats = await syncProcess.getSyncStatistics();
    
    return new Response(JSON.stringify(stats, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  async function handleSearch(request, env, corsHeaders) {
    const search = new VectorSearch(env);
    const response = await search.handleTextSearch(request);
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
  
  async function handleVectorSearch(request, env, corsHeaders) {
    const search = new VectorSearch(env);
    const response = await search.handleVectorSearch(request);
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
  
  async function handleProcess(request, env, corsHeaders) {
    const vectorization = new Vectorization(env);
    const result = await vectorization.processVectorizationQueue();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Vectorization processing started',
      result: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  async function handleMeetings(request, env, corsHeaders) {
    const storage = new TranscriptStorage(env);
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    const meetings = await storage.listRecentMeetings(limit, offset);
    
    return new Response(JSON.stringify({
      success: true,
      meetings: meetings,
      limit: limit,
      offset: offset
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  async function handleFilterOptions(env, corsHeaders) {
    const search = new VectorSearch(env);
    const options = await search.getFilterOptions();
    
    return new Response(JSON.stringify({
      success: true,
      options: options
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  async function syncFirefliesData(env) {
    console.log('Scheduled sync triggered');
    const syncProcess = new SyncProcess(env);
    await syncProcess.handleSync();
  }
  
  async function handleTestPipeline(env, corsHeaders) {
    try {
      const tester = new TestUtils(env);
      const results = await tester.runPipelineTest();
      const report = tester.generateTestReport(results);
      
      return new Response(JSON.stringify({
        success: results.summary.failed === 0,
        results: results,
        report: report
      }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  async function handleValidateTranscript(request, env, corsHeaders) {
    try {
      const url = new URL(request.url);
      const transcriptId = url.searchParams.get('id');
      
      if (!transcriptId) {
        return new Response(JSON.stringify({
          error: 'Missing transcript ID parameter'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const tester = new TestUtils(env);
      const validation = await tester.validateTranscript(transcriptId);
      
      return new Response(JSON.stringify(validation, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  async function handleTestSingleTranscript(request, env, corsHeaders) {
    try {
      // Test downloading and processing a single transcript
      const storage = new TranscriptStorage(env);
      const firefliesClient = new (await import('./firefliesClient.js')).FirefliesClient(env.FIREFLIES_API_KEY);
      
      // Get the most recent transcript
      const transcripts = await firefliesClient.getTranscripts(1);
      
      if (!transcripts || transcripts.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: 'No transcripts found in Fireflies'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const transcriptId = transcripts[0].id;
      console.log(`Testing with transcript: ${transcriptId}`);
      
      // Download and store
      const result = await storage.downloadAndStoreTranscript(transcriptId);
      
      // Validate
      const tester = new TestUtils(env);
      const validation = await tester.validateTranscript(transcriptId);
      
      return new Response(JSON.stringify({
        success: true,
        transcriptId: transcriptId,
        downloadResult: result,
        validation: validation
      }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }