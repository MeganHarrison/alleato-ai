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
    console.log('GraphQL Response:', JSON.stringify(data));
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  async getTranscripts(limit = 25, toDate = null) {
    const query = `
      query GetTranscripts($limit: Int, $toDate: DateTime) {
        transcripts(limit: $limit, toDate: $toDate) {
          title
          id
          transcript_url
          duration
          date
          participants
        }
      }
    `;
    
    const variables = {
      limit: Math.min(limit, 25),
      toDate: toDate
    };
    
    const data = await this.graphqlRequest(query, variables);
    return data.transcripts;
  }

  async getTranscriptById(transcriptId) {
    const query = `
      query GetTranscriptContent($id: String!) {
        transcript(id: $id) {
          title
          id
          transcript_url
          duration
          date
          participants
          sentences {
            text
            speaker_id
            start_time
          }
          summary {
            keywords
            action_items
          }
        }
      }
    `;
    
    const variables = {
      id: transcriptId
    };
    
    const data = await this.graphqlRequest(query, variables);
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
        const speaker = sentence.speaker_id || 'Unknown';
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