/**
 * Vector search functionality for meeting transcripts
 */

import { Vectorization } from './vectorization.js';

export class VectorSearch {
  constructor(env) {
    this.env = env;
    this.vectorization = new Vectorization(env);
  }

  /**
   * Handle vector search request
   */
  async handleVectorSearch(request) {
    try {
      const { query, limit = 10, filters = {} } = await request.json();
      
      if (!query) {
        return new Response(JSON.stringify({
          error: 'Query parameter is required'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`Vector search for: "${query}"`);
      
      // Perform search
      const results = await this.search(query, limit, filters);
      
      return new Response(JSON.stringify({
        success: true,
        query: query,
        results: results,
        count: results.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Vector search error:', error);
      
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
   * Perform vector similarity search
   */
  async search(query, limit = 10, filters = {}) {
    // 1. Generate embedding for query
    const queryEmbedding = await this.vectorization.generateEmbedding(query);
    
    // 2. Build filter conditions
    const filterConditions = this.buildFilterConditions(filters);
    
    // 3. Retrieve candidate chunks
    const candidates = await this.getCandidateChunks(filterConditions, limit * 3);
    
    // 4. Calculate similarities and rank
    const rankedResults = await this.rankResults(candidates, queryEmbedding);
    
    // 5. Get top results with context
    const topResults = rankedResults.slice(0, limit);
    
    // 6. Enrich results with meeting context
    const enrichedResults = await this.enrichResults(topResults);
    
    return enrichedResults;
  }

  /**
   * Build SQL filter conditions from filters
   */
  buildFilterConditions(filters) {
    const conditions = [];
    const params = [];
    
    if (filters.dateFrom) {
      conditions.push('m.date_time >= ?');
      params.push(filters.dateFrom);
    }
    
    if (filters.dateTo) {
      conditions.push('m.date_time <= ?');
      params.push(filters.dateTo);
    }
    
    if (filters.category) {
      conditions.push('m.category = ?');
      params.push(filters.category);
    }
    
    if (filters.project) {
      conditions.push('m.project = ?');
      params.push(filters.project);
    }
    
    if (filters.department) {
      conditions.push('m.department = ?');
      params.push(filters.department);
    }
    
    if (filters.speaker) {
      conditions.push('mc.speaker = ?');
      params.push(filters.speaker);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      // Tags are stored as JSON array
      const tagConditions = filters.tags.map(() => 'json_extract(m.tags, \'$\') LIKE ?');
      conditions.push(`(${tagConditions.join(' OR ')})`);
      filters.tags.forEach(tag => params.push(`%"${tag}"%`));
    }
    
    return {
      where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params: params
    };
  }

  /**
   * Get candidate chunks for similarity comparison
   */
  async getCandidateChunks(filterConditions, limit) {
    // For now, we'll retrieve chunks and do similarity calculation in JS
    // In production, you might want to use a specialized vector database
    
    const query = `
      SELECT 
        mc.id,
        mc.meeting_id,
        mc.content,
        mc.chunk_type,
        mc.speaker,
        mc.start_time,
        mc.end_time,
        mc.embedding,
        m.title as meeting_title,
        m.date_time as meeting_date,
        m.category,
        m.project,
        m.department
      FROM meeting_chunks mc
      JOIN meetings m ON mc.meeting_id = m.id
      ${filterConditions.where}
      WHERE mc.embedding IS NOT NULL
      ORDER BY m.date_time DESC
      LIMIT ?
    `;
    
    const params = [...filterConditions.params, limit];
    const results = await this.env.ALLEATO_DB.prepare(query).bind(...params).all();
    
    return results.results;
  }

  /**
   * Rank results by vector similarity
   */
  async rankResults(candidates, queryEmbedding) {
    const scoredResults = candidates.map(candidate => {
      // Convert blob to float array
      const candidateEmbedding = this.vectorization.blobToFloat32Array(candidate.embedding);
      
      // Calculate cosine similarity
      const similarity = this.vectorization.cosineSimilarity(queryEmbedding, candidateEmbedding);
      
      return {
        ...candidate,
        similarity: similarity,
        relevance_score: similarity
      };
    });
    
    // Sort by similarity descending
    scoredResults.sort((a, b) => b.similarity - a.similarity);
    
    // Filter out low relevance results
    const threshold = 0.7; // Adjust based on testing
    return scoredResults.filter(result => result.similarity >= threshold);
  }

  /**
   * Enrich results with additional context
   */
  async enrichResults(results) {
    const enriched = [];
    
    for (const result of results) {
      // Get surrounding context if needed
      let context = null;
      if (result.chunk_type === 'speaker_turn' || result.chunk_type === 'time_segment') {
        context = await this.getSurroundingContext(
          result.meeting_id, 
          result.start_time, 
          result.end_time
        );
      }
      
      // Format result
      enriched.push({
        meeting: {
          id: result.meeting_id,
          title: result.meeting_title,
          date: result.meeting_date,
          category: result.category,
          project: result.project,
          department: result.department
        },
        chunk: {
          id: result.id,
          type: result.chunk_type,
          content: result.content,
          speaker: result.speaker,
          start_time: result.start_time,
          end_time: result.end_time,
          context: context
        },
        relevance: {
          score: result.relevance_score,
          similarity: result.similarity
        }
      });
    }
    
    return enriched;
  }

  /**
   * Get surrounding context for a chunk
   */
  async getSurroundingContext(meetingId, startTime, endTime, contextWindow = 30) {
    const contextStart = Math.max(0, startTime - contextWindow);
    const contextEnd = endTime + contextWindow;
    
    const query = `
      SELECT content, speaker, start_time, end_time
      FROM meeting_chunks
      WHERE meeting_id = ?
        AND chunk_type = 'speaker_turn'
        AND start_time >= ?
        AND end_time <= ?
        AND start_time < ?
        AND end_time > ?
      ORDER BY start_time
    `;
    
    const results = await this.env.ALLEATO_DB.prepare(query).bind(
      meetingId,
      contextStart,
      contextEnd,
      endTime,
      startTime
    ).all();
    
    return results.results;
  }

  /**
   * Handle regular text search (non-vector)
   */
  async handleTextSearch(request) {
    try {
      const { query, limit = 20, filters = {} } = await request.json();
      
      if (!query) {
        return new Response(JSON.stringify({
          error: 'Query parameter is required'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`Text search for: "${query}"`);
      
      // Perform full-text search
      const results = await this.textSearch(query, limit, filters);
      
      return new Response(JSON.stringify({
        success: true,
        query: query,
        results: results,
        count: results.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Text search error:', error);
      
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
   * Perform full-text search
   */
  async textSearch(query, limit, filters) {
    const filterConditions = this.buildFilterConditions(filters);
    
    // Use LIKE for basic text search
    // In production, consider using FTS5 or external search service
    const searchQuery = `
      SELECT 
        mc.id,
        mc.meeting_id,
        mc.content,
        mc.chunk_type,
        mc.speaker,
        mc.start_time,
        mc.end_time,
        m.title as meeting_title,
        m.date_time as meeting_date,
        m.category,
        m.project,
        m.department,
        m.tags
      FROM meeting_chunks mc
      JOIN meetings m ON mc.meeting_id = m.id
      ${filterConditions.where}
      ${filterConditions.where ? 'AND' : 'WHERE'} LOWER(mc.content) LIKE LOWER(?)
      ORDER BY m.date_time DESC
      LIMIT ?
    `;
    
    const searchPattern = `%${query}%`;
    const params = [...filterConditions.params, searchPattern, limit];
    
    const results = await this.env.ALLEATO_DB.prepare(searchQuery).bind(...params).all();
    
    // Format results
    return results.results.map(result => ({
      meeting: {
        id: result.meeting_id,
        title: result.meeting_title,
        date: result.meeting_date,
        category: result.category,
        project: result.project,
        department: result.department,
        tags: JSON.parse(result.tags || '[]')
      },
      chunk: {
        id: result.id,
        type: result.chunk_type,
        content: this.highlightMatch(result.content, query),
        speaker: result.speaker,
        start_time: result.start_time,
        end_time: result.end_time
      }
    }));
  }

  /**
   * Highlight search matches in content
   */
  highlightMatch(content, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return content.replace(regex, '**$1**');
  }

  /**
   * Get search suggestions based on past queries
   */
  async getSearchSuggestions(prefix, limit = 5) {
    // Get common keywords from meeting summaries
    const query = `
      SELECT DISTINCT json_extract(value, '$') as keyword
      FROM meetings, json_each(tags)
      WHERE LOWER(json_extract(value, '$')) LIKE LOWER(?)
      LIMIT ?
    `;
    
    const results = await this.env.ALLEATO_DB.prepare(query)
      .bind(`${prefix}%`, limit)
      .all();
    
    return results.results.map(r => r.keyword);
  }

  /**
   * Get available filter options
   */
  async getFilterOptions() {
    const options = {
      categories: [],
      projects: [],
      departments: [],
      speakers: []
    };

    // Get distinct categories
    const categories = await this.env.ALLEATO_DB.prepare(
      'SELECT DISTINCT category FROM meetings WHERE category IS NOT NULL ORDER BY category'
    ).all();
    options.categories = categories.results.map(r => r.category);

    // Get distinct projects
    const projects = await this.env.ALLEATO_DB.prepare(
      'SELECT DISTINCT project FROM meetings WHERE project IS NOT NULL ORDER BY project'
    ).all();
    options.projects = projects.results.map(r => r.project);

    // Get distinct departments
    const departments = await this.env.ALLEATO_DB.prepare(
      'SELECT DISTINCT department FROM meetings WHERE department IS NOT NULL ORDER BY department'
    ).all();
    options.departments = departments.results.map(r => r.department);

    // Get distinct speakers
    const speakers = await this.env.ALLEATO_DB.prepare(
      'SELECT DISTINCT speaker FROM meeting_chunks WHERE speaker IS NOT NULL ORDER BY speaker LIMIT 50'
    ).all();
    options.speakers = speakers.results.map(r => r.speaker);

    return options;
  }
}