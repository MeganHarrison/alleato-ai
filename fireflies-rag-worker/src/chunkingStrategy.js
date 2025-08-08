/**
 * Intelligent chunking strategies for meeting transcripts
 */

export class ChunkingStrategy {
  constructor() {
    // Configuration for different chunk types
    this.config = {
      timeSegment: {
        durationSeconds: 300, // 5 minutes
        overlapSeconds: 30   // 30 second overlap
      },
      speakerTurn: {
        maxWords: 500,
        minWords: 50
      }
    };
  }

  /**
   * Apply all chunking strategies to a transcript
   */
  async chunkTranscript(transcript, meetingId) {
    const chunks = [];
    
    // 1. Full transcript chunk (for complete context)
    chunks.push(this.createFullTranscriptChunk(transcript, meetingId));
    
    // 2. Time-based chunks (for temporal navigation)
    const timeChunks = this.createTimeSegmentChunks(transcript, meetingId);
    chunks.push(...timeChunks);
    
    // 3. Speaker turn chunks (for conversation flow)
    const speakerChunks = this.createSpeakerTurnChunks(transcript, meetingId);
    chunks.push(...speakerChunks);
    
    return chunks;
  }

  /**
   * Create a single chunk containing the full transcript
   */
  createFullTranscriptChunk(transcript, meetingId) {
    const content = this.formatFullTranscript(transcript);
    
    return {
      id: `${meetingId}_full`,
      meeting_id: meetingId,
      chunk_index: 0,
      chunk_type: 'full',
      content: content,
      speaker: null,
      start_time: 0,
      end_time: transcript.duration || null
    };
  }

  /**
   * Create time-based chunks with overlap
   */
  createTimeSegmentChunks(transcript, meetingId) {
    const chunks = [];
    const sentences = transcript.sentences || [];
    
    if (sentences.length === 0) return chunks;
    
    const { durationSeconds, overlapSeconds } = this.config.timeSegment;
    let chunkIndex = 1;
    let currentChunkStart = 0;
    
    while (currentChunkStart < (transcript.duration || 0)) {
      const chunkEnd = currentChunkStart + durationSeconds;
      const overlapEnd = chunkEnd + overlapSeconds;
      
      // Get sentences in this time range
      const chunkSentences = sentences.filter(s => 
        s.start_time >= currentChunkStart && s.start_time < overlapEnd
      );
      
      if (chunkSentences.length > 0) {
        const content = this.formatTimeSegment(
          chunkSentences, 
          currentChunkStart, 
          chunkEnd,
          transcript.title
        );
        
        chunks.push({
          id: `${meetingId}_time_${chunkIndex}`,
          meeting_id: meetingId,
          chunk_index: chunkIndex,
          chunk_type: 'time_segment',
          content: content,
          speaker: null,
          start_time: currentChunkStart,
          end_time: Math.min(chunkEnd, transcript.duration || chunkEnd)
        });
        
        chunkIndex++;
      }
      
      currentChunkStart += durationSeconds;
    }
    
    return chunks;
  }

  /**
   * Create speaker-based chunks
   */
  createSpeakerTurnChunks(transcript, meetingId) {
    const chunks = [];
    const sentences = transcript.sentences || [];
    
    if (sentences.length === 0) return chunks;
    
    let currentSpeaker = null;
    let currentTurn = [];
    let chunkIndex = 100; // Start from 100 to avoid conflicts
    
    sentences.forEach((sentence, index) => {
      if (sentence.speaker_name !== currentSpeaker) {
        // Process previous turn
        if (currentTurn.length > 0) {
          const turnChunks = this.splitLongSpeakerTurn(
            currentTurn, 
            currentSpeaker, 
            meetingId, 
            chunkIndex,
            transcript.title
          );
          chunks.push(...turnChunks);
          chunkIndex += turnChunks.length;
        }
        
        // Start new turn
        currentSpeaker = sentence.speaker_name;
        currentTurn = [sentence];
      } else {
        currentTurn.push(sentence);
      }
    });
    
    // Don't forget the last turn
    if (currentTurn.length > 0) {
      const turnChunks = this.splitLongSpeakerTurn(
        currentTurn, 
        currentSpeaker, 
        meetingId, 
        chunkIndex,
        transcript.title
      );
      chunks.push(...turnChunks);
    }
    
    return chunks;
  }

  /**
   * Split long speaker turns into smaller chunks
   */
  splitLongSpeakerTurn(sentences, speaker, meetingId, baseIndex, meetingTitle) {
    const chunks = [];
    const { maxWords, minWords } = this.config.speakerTurn;
    
    let currentChunk = [];
    let currentWordCount = 0;
    let subIndex = 0;
    
    sentences.forEach((sentence, index) => {
      const wordCount = sentence.text.split(' ').length;
      
      if (currentWordCount + wordCount > maxWords && currentWordCount >= minWords) {
        // Create chunk
        chunks.push(this.createSpeakerChunk(
          currentChunk,
          speaker,
          meetingId,
          baseIndex + subIndex,
          meetingTitle
        ));
        
        subIndex++;
        currentChunk = [sentence];
        currentWordCount = wordCount;
      } else {
        currentChunk.push(sentence);
        currentWordCount += wordCount;
      }
    });
    
    // Add remaining sentences
    if (currentChunk.length > 0) {
      chunks.push(this.createSpeakerChunk(
        currentChunk,
        speaker,
        meetingId,
        baseIndex + subIndex,
        meetingTitle
      ));
    }
    
    return chunks;
  }

  /**
   * Create a speaker chunk from sentences
   */
  createSpeakerChunk(sentences, speaker, meetingId, chunkIndex, meetingTitle) {
    const content = this.formatSpeakerTurn(sentences, speaker, meetingTitle);
    const startTime = sentences[0].start_time;
    const endTime = sentences[sentences.length - 1].end_time;
    
    return {
      id: `${meetingId}_speaker_${chunkIndex}`,
      meeting_id: meetingId,
      chunk_index: chunkIndex,
      chunk_type: 'speaker_turn',
      content: content,
      speaker: speaker,
      start_time: startTime,
      end_time: endTime
    };
  }

  /**
   * Format full transcript for embedding
   */
  formatFullTranscript(transcript) {
    let content = `Meeting: ${transcript.title}\n`;
    content += `Date: ${new Date(transcript.date).toLocaleString()}\n`;
    
    if (transcript.summary && transcript.summary.overview) {
      content += `\nSummary: ${transcript.summary.overview}\n`;
    }
    
    content += `\nFull Transcript:\n`;
    
    // Add formatted conversation
    const sentences = transcript.sentences || [];
    let currentSpeaker = null;
    let speakerText = [];
    
    sentences.forEach(sentence => {
      if (sentence.speaker_name !== currentSpeaker) {
        if (speakerText.length > 0) {
          content += `${currentSpeaker}: ${speakerText.join(' ')}\n`;
        }
        currentSpeaker = sentence.speaker_name;
        speakerText = [sentence.text];
      } else {
        speakerText.push(sentence.text);
      }
    });
    
    if (speakerText.length > 0) {
      content += `${currentSpeaker}: ${speakerText.join(' ')}\n`;
    }
    
    return content;
  }

  /**
   * Format time segment for embedding
   */
  formatTimeSegment(sentences, startTime, endTime, meetingTitle) {
    const startMinutes = Math.floor(startTime / 60);
    const endMinutes = Math.floor(endTime / 60);
    
    let content = `Meeting: ${meetingTitle}\n`;
    content += `Time Segment: ${startMinutes}-${endMinutes} minutes\n\n`;
    
    let currentSpeaker = null;
    let speakerText = [];
    
    sentences.forEach(sentence => {
      if (sentence.speaker_name !== currentSpeaker) {
        if (speakerText.length > 0) {
          content += `${currentSpeaker}: ${speakerText.join(' ')}\n`;
        }
        currentSpeaker = sentence.speaker_name;
        speakerText = [sentence.text];
      } else {
        speakerText.push(sentence.text);
      }
    });
    
    if (speakerText.length > 0) {
      content += `${currentSpeaker}: ${speakerText.join(' ')}\n`;
    }
    
    return content;
  }

  /**
   * Format speaker turn for embedding
   */
  formatSpeakerTurn(sentences, speaker, meetingTitle) {
    let content = `Meeting: ${meetingTitle}\n`;
    content += `Speaker: ${speaker}\n`;
    
    const timeMinutes = Math.floor(sentences[0].start_time / 60);
    content += `Time: ${timeMinutes} minutes\n\n`;
    
    content += sentences.map(s => s.text).join(' ');
    
    return content;
  }

  /**
   * Calculate optimal chunk size based on transcript length
   */
  getOptimalChunkSize(transcriptDuration) {
    // For meetings under 30 minutes, use smaller chunks
    if (transcriptDuration < 1800) {
      return {
        timeSegment: { durationSeconds: 180, overlapSeconds: 20 },
        speakerTurn: { maxWords: 300, minWords: 30 }
      };
    }
    // For meetings 30-60 minutes
    else if (transcriptDuration < 3600) {
      return {
        timeSegment: { durationSeconds: 300, overlapSeconds: 30 },
        speakerTurn: { maxWords: 500, minWords: 50 }
      };
    }
    // For longer meetings
    else {
      return {
        timeSegment: { durationSeconds: 600, overlapSeconds: 60 },
        speakerTurn: { maxWords: 800, minWords: 100 }
      };
    }
  }
}