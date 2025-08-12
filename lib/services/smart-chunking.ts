/**
 * Smart Chunking Service with Entity Extraction
 * Implements intelligent chunking that preserves context and extracts entities
 * Features:
 * - Sliding window chunking with overlap
 * - Speaker-aware chunking for meetings
 * - Entity extraction (people, projects, decisions, dates)
 * - Chunk relationship tracking
 * - Context preservation
 */

import { OpenAI } from 'openai';

export interface ChunkConfig {
  maxTokens: number;
  minTokens: number;
  overlapTokens: number;
  targetTokens: number;
}

export interface ExtractedEntity {
  type: 'person' | 'project' | 'decision' | 'action_item' | 'date' | 'client' | 'risk' | 'milestone';
  value: string;
  confidence: number;
  context?: string;
  position?: number;
}

export interface SmartChunk {
  id: string;
  content: string;
  type: 'speaker_turn' | 'topic_segment' | 'context_window' | 'summary';
  position: number;
  tokenCount: number;
  
  // Speaker information for meetings
  speaker?: string;
  startTime?: number;
  endTime?: number;
  
  // Relationships
  previousChunkId?: string;
  nextChunkId?: string;
  parentChunkId?: string;
  
  // Extracted entities
  entities: ExtractedEntity[];
  
  // Metadata
  topics: string[];
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  importance: number; // 0-1 score
  
  // Context preservation
  contextBefore?: string;
  contextAfter?: string;
}

export interface ChunkingResult {
  chunks: SmartChunk[];
  metadata: DocumentMetadata;
  relationships: ChunkRelationship[];
}

export interface DocumentMetadata {
  totalTokens: number;
  chunkCount: number;
  extractedEntities: Map<string, ExtractedEntity[]>;
  topics: string[];
  speakers?: string[];
  timeline?: TimelineEvent[];
  summary?: string;
}

export interface ChunkRelationship {
  fromChunkId: string;
  toChunkId: string;
  type: 'sequential' | 'reference' | 'topic_continuation' | 'speaker_continuation';
  strength: number; // 0-1
}

export interface TimelineEvent {
  timestamp: number;
  type: 'decision' | 'action_item' | 'milestone' | 'risk';
  description: string;
  chunkId: string;
}

const DEFAULT_CONFIG: ChunkConfig = {
  maxTokens: 1500,
  minTokens: 100,
  overlapTokens: 200,
  targetTokens: 1000,
};

// Enhanced entity patterns with confidence scoring
const ENTITY_PATTERNS = {
  person: [
    { pattern: /(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:\s+(?:said|mentioned|asked|responded|suggested|proposed|agreed|disagreed))/g, confidence: 0.9 },
    { pattern: /(?:^|\s)(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g, confidence: 0.95 },
    { pattern: /(?:Participants?|Attendees?|Present):\s*([^,\n]+(?:,\s*[^,\n]+)*)/gi, confidence: 0.85 },
    { pattern: /(?:@)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g, confidence: 0.8 },
  ],
  
  project: [
    { pattern: /(?:project|Project)\s+(?:name|Name)?:?\s*"?([^"\n,]+)"?/gi, confidence: 0.9 },
    { pattern: /(?:working on|developing|building|implementing)\s+(?:the\s+)?([A-Z][A-Za-z0-9\s\-]{3,50})\s+(?:project|system|platform)/gi, confidence: 0.85 },
    { pattern: /(?:for\s+)?(?:the\s+)?([A-Z][A-Za-z0-9\s\-]{3,50})\s+(?:Project|Initiative|Program)/g, confidence: 0.8 },
  ],
  
  decision: [
    { pattern: /(?:Decision|Decided|Agreed|Resolved|Concluded):\s*([^\n]+)/gi, confidence: 0.95 },
    { pattern: /(?:We|The team|It was)\s+(?:decided|agreed|resolved)\s+(?:to|that)\s+([^.!?]+)[.!?]/gi, confidence: 0.85 },
    { pattern: /(?:will|shall|must|should)\s+(?:now|going forward)\s+([^.!?]+)[.!?]/gi, confidence: 0.7 },
  ],
  
  action_item: [
    { pattern: /(?:Action Item|TODO|Task|Follow-up):\s*([^\n]+)(?:\s*-\s*(?:Owner|Assigned to|Assignee):\s*([A-Za-z\s]+))?(?:\s*-\s*(?:Due|Deadline|By):\s*([^\n]+))?/gi, confidence: 0.95 },
    { pattern: /(?:need to|needs to|will|shall)\s+([^.!?]+)\s+by\s+([^.!?]+)[.!?]/gi, confidence: 0.75 },
    { pattern: /\[\s*\]\s*([^\n]+)(?:\s*@([A-Za-z\s]+))?/g, confidence: 0.8 },
  ],
  
  date: [
    { pattern: /\b(\d{4}-\d{2}-\d{2})\b/g, confidence: 0.95 },
    { pattern: /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g, confidence: 0.95 },
    { pattern: /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\b/gi, confidence: 0.9 },
    { pattern: /\b((?:next|last|this)\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|week|month|quarter|year))\b/gi, confidence: 0.8 },
  ],
  
  client: [
    { pattern: /(?:client|Client|customer|Customer)\s+(?:name|Name)?:?\s*"?([^"\n,]{2,50})"?/gi, confidence: 0.9 },
    { pattern: /(?:for|with|from)\s+(?:client|customer)\s+([A-Z][A-Za-z0-9\s\-&]{2,50})(?:\s|,|\.)/gi, confidence: 0.85 },
  ],
  
  risk: [
    { pattern: /(?:Risk|Issue|Concern|Problem|Blocker):\s*([^\n]+)/gi, confidence: 0.9 },
    { pattern: /(?:risk|issue|concern|problem)\s+(?:is|are)\s+(?:that\s+)?([^.!?]+)[.!?]/gi, confidence: 0.8 },
    { pattern: /(?:may|might|could)\s+(?:cause|lead to|result in)\s+([^.!?]+)[.!?]/gi, confidence: 0.7 },
  ],
  
  milestone: [
    { pattern: /(?:Milestone|Deliverable|Deadline):\s*([^\n]+)/gi, confidence: 0.9 },
    { pattern: /(?:complete|deliver|finish|launch)\s+(?:by|on)\s+([^.!?]+)[.!?]/gi, confidence: 0.75 },
  ],
};

export class SmartChunkingService {
  private config: ChunkConfig;
  private openai?: OpenAI;

  constructor(config: Partial<ChunkConfig> = {}, openaiApiKey?: string) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }
  }

  /**
   * Main chunking function that processes content with smart chunking
   */
  async processContent(
    content: string,
    documentType: 'meeting' | 'document' | 'email' | 'chat' = 'document'
  ): Promise<ChunkingResult> {
    // Extract entities from the entire document first
    const documentEntities = this.extractEntities(content);
    
    // Detect document structure
    const structure = this.detectStructure(content, documentType);
    
    // Create chunks based on document type and structure
    let chunks: SmartChunk[];
    if (documentType === 'meeting' && structure.hasSpeakers) {
      chunks = await this.createSpeakerAwareChunks(content, structure);
    } else if (structure.hasHeaders) {
      chunks = await this.createTopicBasedChunks(content, structure);
    } else {
      chunks = await this.createSlidingWindowChunks(content);
    }
    
    // Enhance chunks with entities and relationships
    chunks = this.enhanceChunksWithEntities(chunks, documentEntities);
    
    // Build chunk relationships
    const relationships = this.buildChunkRelationships(chunks);
    
    // Generate document metadata
    const metadata = this.generateMetadata(chunks, documentEntities, relationships);
    
    // Add AI-powered enhancements if OpenAI is available
    if (this.openai) {
      chunks = await this.enhanceWithAI(chunks);
    }
    
    return {
      chunks,
      metadata,
      relationships,
    };
  }

  /**
   * Extract entities from content using patterns and NLP
   */
  private extractEntities(content: string): Map<string, ExtractedEntity[]> {
    const entities = new Map<string, ExtractedEntity[]>();
    
    for (const [entityType, patterns] of Object.entries(ENTITY_PATTERNS)) {
      const typeEntities: ExtractedEntity[] = [];
      
      for (const { pattern, confidence } of patterns) {
        const matches = Array.from(content.matchAll(pattern));
        
        for (const match of matches) {
          const value = match[1]?.trim();
          if (value && value.length > 1) {
            // Deduplicate and merge similar entities
            const existing = typeEntities.find(e => 
              this.similarityScore(e.value.toLowerCase(), value.toLowerCase()) > 0.8
            );
            
            if (existing) {
              existing.confidence = Math.max(existing.confidence, confidence);
            } else {
              typeEntities.push({
                type: entityType as ExtractedEntity['type'],
                value,
                confidence,
                context: this.extractContext(content, match.index || 0),
                position: match.index,
              });
            }
          }
        }
      }
      
      // Sort by confidence and position
      typeEntities.sort((a, b) => b.confidence - a.confidence);
      entities.set(entityType, typeEntities);
    }
    
    return entities;
  }

  /**
   * Create speaker-aware chunks for meeting transcripts
   */
  private async createSpeakerAwareChunks(
    content: string,
    structure: DocumentStructure
  ): Promise<SmartChunk[]> {
    const chunks: SmartChunk[] = [];
    const lines = content.split('\n');
    
    let currentChunk: string[] = [];
    let currentSpeaker: string | undefined;
    let currentStartTime: number | undefined;
    let chunkPosition = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect speaker change
      const speakerMatch = line.match(/^(?:\[(\d+:\d+)\])?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:/);
      
      if (speakerMatch) {
        // Save current chunk if it exists
        if (currentChunk.length > 0) {
          const chunkContent = currentChunk.join('\n');
          const chunkId = this.generateChunkId(chunkPosition);
          
          chunks.push({
            id: chunkId,
            content: chunkContent,
            type: 'speaker_turn',
            position: chunkPosition++,
            tokenCount: this.estimateTokens(chunkContent),
            speaker: currentSpeaker,
            startTime: currentStartTime,
            entities: [],
            topics: this.extractTopics(chunkContent),
            importance: this.calculateImportance(chunkContent),
          });
        }
        
        // Start new chunk
        currentSpeaker = speakerMatch[2];
        currentChunk = [line];
        
        // Parse timestamp if available
        if (speakerMatch[1]) {
          const [minutes, seconds] = speakerMatch[1].split(':').map(Number);
          currentStartTime = minutes * 60 + seconds;
        }
      } else {
        currentChunk.push(line);
      }
      
      // Check if chunk is getting too large
      const currentTokens = this.estimateTokens(currentChunk.join('\n'));
      if (currentTokens >= this.config.targetTokens) {
        const chunkContent = currentChunk.join('\n');
        const chunkId = this.generateChunkId(chunkPosition);
        
        chunks.push({
          id: chunkId,
          content: chunkContent,
          type: 'speaker_turn',
          position: chunkPosition++,
          tokenCount: currentTokens,
          speaker: currentSpeaker,
          startTime: currentStartTime,
          entities: [],
          topics: this.extractTopics(chunkContent),
          importance: this.calculateImportance(chunkContent),
        });
        
        // Keep last few lines for context
        const overlap = Math.floor(currentChunk.length * 0.1);
        currentChunk = currentChunk.slice(-overlap);
      }
    }
    
    // Save final chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join('\n');
      const chunkId = this.generateChunkId(chunkPosition);
      
      chunks.push({
        id: chunkId,
        content: chunkContent,
        type: 'speaker_turn',
        position: chunkPosition,
        tokenCount: this.estimateTokens(chunkContent),
        speaker: currentSpeaker,
        startTime: currentStartTime,
        entities: [],
        topics: this.extractTopics(chunkContent),
        importance: this.calculateImportance(chunkContent),
      });
    }
    
    // Add chunk relationships
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) chunks[i].previousChunkId = chunks[i - 1].id;
      if (i < chunks.length - 1) chunks[i].nextChunkId = chunks[i + 1].id;
      
      // Add context windows
      if (i > 0) {
        const prevLines = chunks[i - 1].content.split('\n').slice(-3).join('\n');
        chunks[i].contextBefore = prevLines;
      }
      if (i < chunks.length - 1) {
        const nextLines = chunks[i + 1].content.split('\n').slice(0, 3).join('\n');
        chunks[i].contextAfter = nextLines;
      }
    }
    
    return chunks;
  }

  /**
   * Create topic-based chunks for structured documents
   */
  private async createTopicBasedChunks(
    content: string,
    structure: DocumentStructure
  ): Promise<SmartChunk[]> {
    const chunks: SmartChunk[] = [];
    const sections = this.splitBySections(content, structure.headers || []);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // If section is too large, split it further
      if (this.estimateTokens(section.content) > this.config.maxTokens) {
        const subChunks = await this.createSlidingWindowChunks(section.content);
        
        // Mark these as child chunks of the section
        const parentId = this.generateChunkId(i);
        subChunks.forEach((chunk, j) => {
          chunk.parentChunkId = parentId;
          chunk.position = i + (j + 1) * 0.1; // Decimal positions for sub-chunks
        });
        
        chunks.push(...subChunks);
      } else {
        chunks.push({
          id: this.generateChunkId(i),
          content: section.content,
          type: 'topic_segment',
          position: i,
          tokenCount: this.estimateTokens(section.content),
          entities: [],
          topics: [section.header || 'General'],
          importance: this.calculateImportance(section.content),
        });
      }
    }
    
    return chunks;
  }

  /**
   * Create sliding window chunks with overlap
   */
  private async createSlidingWindowChunks(content: string): Promise<SmartChunk[]> {
    const chunks: SmartChunk[] = [];
    const sentences = this.splitIntoSentences(content);
    
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkPosition = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.estimateTokens(sentence);
      
      // Check if adding this sentence would exceed target
      if (currentTokens + sentenceTokens > this.config.targetTokens && currentChunk.length > 0) {
        // Create chunk with current content
        const chunkContent = currentChunk.join(' ');
        const chunkId = this.generateChunkId(chunkPosition);
        
        chunks.push({
          id: chunkId,
          content: chunkContent,
          type: 'context_window',
          position: chunkPosition++,
          tokenCount: currentTokens,
          entities: [],
          topics: this.extractTopics(chunkContent),
          importance: this.calculateImportance(chunkContent),
        });
        
        // Create overlap by keeping last portion
        const overlapSentences = Math.ceil(currentChunk.length * 0.2);
        currentChunk = currentChunk.slice(-overlapSentences);
        currentTokens = this.estimateTokens(currentChunk.join(' '));
      }
      
      currentChunk.push(sentence);
      currentTokens += sentenceTokens;
    }
    
    // Add final chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join(' ');
      chunks.push({
        id: this.generateChunkId(chunkPosition),
        content: chunkContent,
        type: 'context_window',
        position: chunkPosition,
        tokenCount: currentTokens,
        entities: [],
        topics: this.extractTopics(chunkContent),
        importance: this.calculateImportance(chunkContent),
      });
    }
    
    // Add relationships and context
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) chunks[i].previousChunkId = chunks[i - 1].id;
      if (i < chunks.length - 1) chunks[i].nextChunkId = chunks[i + 1].id;
    }
    
    return chunks;
  }

  /**
   * Enhance chunks with extracted entities
   */
  private enhanceChunksWithEntities(
    chunks: SmartChunk[],
    documentEntities: Map<string, ExtractedEntity[]>
  ): SmartChunk[] {
    for (const chunk of chunks) {
      const chunkEntities: ExtractedEntity[] = [];
      
      // Find entities that appear in this chunk
      for (const [entityType, entities] of documentEntities.entries()) {
        for (const entity of entities) {
          if (chunk.content.toLowerCase().includes(entity.value.toLowerCase())) {
            chunkEntities.push({
              ...entity,
              type: entityType as ExtractedEntity['type'],
            });
          }
        }
      }
      
      // Sort by confidence and deduplicate
      chunk.entities = this.deduplicateEntities(chunkEntities);
      
      // Calculate sentiment if we have decision or risk entities
      if (chunk.entities.some(e => e.type === 'decision' || e.type === 'risk')) {
        chunk.sentiment = this.analyzeSentiment(chunk.content);
      }
    }
    
    return chunks;
  }

  /**
   * Build relationships between chunks
   */
  private buildChunkRelationships(chunks: SmartChunk[]): ChunkRelationship[] {
    const relationships: ChunkRelationship[] = [];
    
    // Sequential relationships
    for (let i = 0; i < chunks.length - 1; i++) {
      relationships.push({
        fromChunkId: chunks[i].id,
        toChunkId: chunks[i + 1].id,
        type: 'sequential',
        strength: 1.0,
      });
    }
    
    // Topic continuation relationships
    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        const topicSimilarity = this.calculateTopicSimilarity(chunks[i].topics, chunks[j].topics);
        if (topicSimilarity > 0.7) {
          relationships.push({
            fromChunkId: chunks[i].id,
            toChunkId: chunks[j].id,
            type: 'topic_continuation',
            strength: topicSimilarity,
          });
        }
      }
    }
    
    // Speaker continuation for meetings
    const speakerChunks = chunks.filter(c => c.speaker);
    for (let i = 0; i < speakerChunks.length; i++) {
      for (let j = i + 1; j < speakerChunks.length; j++) {
        if (speakerChunks[i].speaker === speakerChunks[j].speaker) {
          relationships.push({
            fromChunkId: speakerChunks[i].id,
            toChunkId: speakerChunks[j].id,
            type: 'speaker_continuation',
            strength: 0.8,
          });
        }
      }
    }
    
    // Entity reference relationships
    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        const sharedEntities = this.findSharedEntities(chunks[i].entities, chunks[j].entities);
        if (sharedEntities.length > 0) {
          relationships.push({
            fromChunkId: chunks[i].id,
            toChunkId: chunks[j].id,
            type: 'reference',
            strength: Math.min(1.0, sharedEntities.length * 0.3),
          });
        }
      }
    }
    
    return relationships;
  }

  /**
   * Generate document metadata
   */
  private generateMetadata(
    chunks: SmartChunk[],
    entities: Map<string, ExtractedEntity[]>,
    relationships: ChunkRelationship[]
  ): DocumentMetadata {
    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
    const allTopics = new Set<string>();
    const speakers = new Set<string>();
    const timeline: TimelineEvent[] = [];
    
    for (const chunk of chunks) {
      // Collect topics
      chunk.topics.forEach(topic => allTopics.add(topic));
      
      // Collect speakers
      if (chunk.speaker) speakers.add(chunk.speaker);
      
      // Build timeline from important entities
      for (const entity of chunk.entities) {
        if (entity.type === 'decision' || entity.type === 'action_item' || 
            entity.type === 'milestone' || entity.type === 'risk') {
          timeline.push({
            timestamp: chunk.startTime || chunk.position,
            type: entity.type,
            description: entity.value,
            chunkId: chunk.id,
          });
        }
      }
    }
    
    // Sort timeline by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);
    
    return {
      totalTokens,
      chunkCount: chunks.length,
      extractedEntities: entities,
      topics: Array.from(allTopics),
      speakers: speakers.size > 0 ? Array.from(speakers) : undefined,
      timeline: timeline.length > 0 ? timeline : undefined,
    };
  }

  /**
   * Enhance chunks with AI-powered analysis
   */
  private async enhanceWithAI(chunks: SmartChunk[]): Promise<SmartChunk[]> {
    if (!this.openai) return chunks;
    
    // Process important chunks with AI for better entity extraction
    const importantChunks = chunks.filter(c => c.importance > 0.7);
    
    for (const chunk of importantChunks) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Extract entities, summarize key points, and identify the main topic from the text.',
            },
            {
              role: 'user',
              content: chunk.content,
            },
          ],
          max_tokens: 200,
          temperature: 0.3,
        });
        
        // Parse AI response and enhance chunk
        const aiAnalysis = response.choices[0].message.content;
        if (aiAnalysis) {
          // Add AI-extracted insights to chunk metadata
          // This is simplified - in production, you'd parse structured output
          chunk.topics = [...chunk.topics, ...this.extractTopics(aiAnalysis)];
        }
      } catch (error) {
        console.error('AI enhancement error:', error);
        // Continue without AI enhancement
      }
    }
    
    return chunks;
  }

  // Helper methods

  private detectStructure(content: string, documentType: string): DocumentStructure {
    const hasSpeakers = /^(?:\[?\d+:\d+\]?)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*:/m.test(content);
    const headers = this.extractHeaders(content);
    const hasHeaders = headers.length > 0;
    
    return {
      hasSpeakers,
      hasHeaders,
      headers,
      documentType,
    };
  }

  private extractHeaders(content: string): string[] {
    const headers: string[] = [];
    const headerPatterns = [
      /^#{1,6}\s+(.+)$/gm, // Markdown headers
      /^([A-Z][A-Z\s]{2,})$/gm, // All caps headers
      /^(\d+\.\s+[A-Z].+)$/gm, // Numbered sections
    ];
    
    for (const pattern of headerPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      headers.push(...matches.map(m => m[1]));
    }
    
    return headers;
  }

  private splitBySections(content: string, headers: string[]): Section[] {
    const sections: Section[] = [];
    let currentSection = { header: 'Introduction', content: '' };
    
    const lines = content.split('\n');
    for (const line of lines) {
      const isHeader = headers.some(h => line.includes(h));
      
      if (isHeader) {
        if (currentSection.content) {
          sections.push(currentSection);
        }
        currentSection = { header: line, content: '' };
      } else {
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection.content) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitter - in production, use a proper NLP library
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private extractTopics(content: string): string[] {
    // Simple keyword extraction - in production, use TF-IDF or similar
    const words = content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const stopWords = new Set(['this', 'that', 'these', 'those', 'will', 'would', 'could', 'should']);
    
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (!stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private calculateImportance(content: string): number {
    let score = 0.5; // Base score
    
    // Increase score for decision keywords
    if (/decision|decided|agreed|resolved/i.test(content)) score += 0.2;
    
    // Increase for action items
    if (/action item|todo|task|follow.?up/i.test(content)) score += 0.15;
    
    // Increase for risks
    if (/risk|issue|concern|problem|blocker/i.test(content)) score += 0.15;
    
    // Increase for milestones
    if (/milestone|deadline|deliverable|launch/i.test(content)) score += 0.1;
    
    return Math.min(1.0, score);
  }

  private analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' | 'mixed' {
    const positive = /success|achieved|completed|excellent|great|good|resolved|approved/gi;
    const negative = /fail|problem|issue|risk|concern|delay|blocked|rejected/gi;
    
    const posMatches = (content.match(positive) || []).length;
    const negMatches = (content.match(negative) || []).length;
    
    if (posMatches > negMatches * 2) return 'positive';
    if (negMatches > posMatches * 2) return 'negative';
    if (posMatches > 0 && negMatches > 0) return 'mixed';
    return 'neutral';
  }

  private extractContext(content: string, position: number, windowSize: number = 100): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(content.length, position + windowSize);
    return content.substring(start, end);
  }

  private similarityScore(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const unique = new Map<string, ExtractedEntity>();
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      const existing = unique.get(key);
      
      if (!existing || entity.confidence > existing.confidence) {
        unique.set(key, entity);
      }
    }
    
    return Array.from(unique.values());
  }

  private calculateTopicSimilarity(topics1: string[], topics2: string[]): number {
    const set1 = new Set(topics1);
    const set2 = new Set(topics2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private findSharedEntities(entities1: ExtractedEntity[], entities2: ExtractedEntity[]): ExtractedEntity[] {
    const shared: ExtractedEntity[] = [];
    
    for (const e1 of entities1) {
      for (const e2 of entities2) {
        if (e1.type === e2.type && e1.value.toLowerCase() === e2.value.toLowerCase()) {
          shared.push(e1);
          break;
        }
      }
    }
    
    return shared;
  }

  private generateChunkId(position: number): string {
    return `chunk_${position}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Type definitions
interface DocumentStructure {
  hasSpeakers: boolean;
  hasHeaders: boolean;
  headers?: string[];
  documentType: string;
}

interface Section {
  header: string;
  content: string;
}

// Export for use in other modules
export default SmartChunkingService;