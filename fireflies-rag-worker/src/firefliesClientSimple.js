/**
 * Simplified Fireflies.ai API Client
 */

export class FirefliesClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.fireflies.ai/graphql';
  }

  async graphqlRequest(query, variables = {}) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`Fireflies API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  async getTranscripts(limit = 50, skip = 0) {
    // Simplified query with only known working fields
    const query = `
      query GetTranscripts($limit: Int!, $skip: Int!) {
        transcripts(limit: $limit, skip: $skip) {
          id
          title
          date
          duration
          participants {
            displayName
            email
          }
        }
      }
    `;

    const data = await this.graphqlRequest(query, { limit, skip });
    return data.transcripts;
  }

  async getTranscriptById(transcriptId) {
    // Get detailed transcript with sentences
    const query = `
      query GetTranscript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          id
          title
          date
          duration
          organizer_email
          participants {
            displayName
            email
          }
          sentences {
            text
            speaker_name
            raw_speaker
            start_time
            end_time
          }
          summary
        }
      }
    `;

    const data = await this.graphqlRequest(query, { transcriptId });
    return data.transcript;
  }

  formatTranscriptAsMarkdown(transcript) {
    let markdown = `# ${transcript.title}\n\n`;
    markdown += `**Date:** ${new Date(transcript.date).toLocaleString()}\n`;
    markdown += `**Duration:** ${Math.floor(transcript.duration / 60)} minutes\n`;
    
    if (transcript.organizer_email) {
      markdown += `**Organizer:** ${transcript.organizer_email}\n`;
    }
    
    if (transcript.participants && transcript.participants.length > 0) {
      markdown += `**Participants:** ${transcript.participants.map(p => p.displayName || p.email).join(', ')}\n`;
    }
    
    markdown += `\n---\n\n`;

    // Summary section
    if (transcript.summary) {
      markdown += `## Summary\n\n`;
      
      // Handle different summary formats
      if (typeof transcript.summary === 'string') {
        markdown += `${transcript.summary}\n\n`;
      } else if (transcript.summary.overview) {
        markdown += `${transcript.summary.overview}\n\n`;
      }
    }

    markdown += `## Transcript\n\n`;

    // Format sentences into readable transcript
    if (transcript.sentences && transcript.sentences.length > 0) {
      let currentSpeaker = null;
      let currentParagraph = [];

      transcript.sentences.forEach(sentence => {
        const speaker = sentence.speaker_name || sentence.raw_speaker || 'Unknown';
        if (speaker !== currentSpeaker) {
          if (currentParagraph.length > 0) {
            markdown += `**${currentSpeaker}:** ${currentParagraph.join(' ')}\n\n`;
          }
          currentSpeaker = speaker;
          currentParagraph = [sentence.text];
        } else {
          currentParagraph.push(sentence.text);
        }
      });

      // Don't forget the last paragraph
      if (currentParagraph.length > 0) {
        markdown += `**${currentSpeaker}:** ${currentParagraph.join(' ')}\n\n`;
      }
    }

    return markdown;
  }

  extractMetadata(transcript) {
    const metadata = {
      category: 'general',
      tags: [],
      project: null,
      department: null
    };

    // Extract from title
    const titleLower = transcript.title.toLowerCase();
    
    // Category detection
    if (titleLower.includes('standup') || titleLower.includes('daily')) {
      metadata.category = 'standup';
    } else if (titleLower.includes('planning') || titleLower.includes('sprint')) {
      metadata.category = 'planning';
    } else if (titleLower.includes('review') || titleLower.includes('retro')) {
      metadata.category = 'review';
    } else if (titleLower.includes('1:1') || titleLower.includes('one-on-one')) {
      metadata.category = 'one-on-one';
    }

    // Simple keyword extraction from title
    const keywords = titleLower.split(/\s+/).filter(word => word.length > 3);
    metadata.tags = keywords.slice(0, 5);

    return metadata;
  }

  async downloadTranscript(transcriptUrl) {
    // Not used in simplified version
    return '';
  }
}