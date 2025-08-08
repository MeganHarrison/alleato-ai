/**
 * Fireflies.ai API Client
 * Documentation: https://docs.fireflies.ai/api
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

  async getTranscripts(limit = 50, skip = 0, fromDate = null) {
    const query = `
      query GetTranscripts($limit: Int!, $skip: Int!) {
        transcripts(
          limit: $limit
          skip: $skip
        ) {
          id
          title
          date
          duration
          organizer_email
          participants {
            displayName
            email
          }
          meeting_url
          transcript_url
          transcript {
            sentences {
              text
              speaker_name
              start_time
              end_time
            }
          }
          summary {
            overview
            keywords
            action_items
          }
        }
      }
    `;

    const variables = { limit, skip };

    const data = await this.graphqlRequest(query, variables);
    return data.transcripts;
  }

  async getTranscriptById(transcriptId) {
    const query = `
      query GetTranscript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          id
          title
          date
          duration
          organizer_email
          fireflies_users
          participants {
            name
            email
          }
          meeting_url
          transcript_url
          audio_url
          video_url
          sentences {
            text
            speaker_name
            start_time
            end_time
          }
          summary {
            overview
            keywords
            action_items
            questions
            notes
            outline
          }
          topic_tracker {
            topic
            start_time
            end_time
          }
        }
      }
    `;

    const data = await this.graphqlRequest(query, { transcriptId });
    return data.transcript;
  }

  async downloadTranscript(transcriptUrl) {
    // Direct download of transcript file
    const response = await fetch(transcriptUrl, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download transcript: ${response.status}`);
    }

    return await response.text();
  }

  formatTranscriptAsMarkdown(transcript) {
    let markdown = `# ${transcript.title}\n\n`;
    markdown += `**Date:** ${new Date(transcript.date).toLocaleString()}\n`;
    markdown += `**Duration:** ${Math.floor(transcript.duration / 60)} minutes\n`;
    markdown += `**Organizer:** ${transcript.organizer_email}\n`;
    
    if (transcript.participants && transcript.participants.length > 0) {
      markdown += `**Participants:** ${transcript.participants.map(p => p.name || p.email).join(', ')}\n`;
    }
    
    markdown += `\n---\n\n`;

    // Summary section
    if (transcript.summary) {
      markdown += `## Summary\n\n`;
      if (transcript.summary.overview) {
        markdown += `${transcript.summary.overview}\n\n`;
      }
      
      if (transcript.summary.keywords && transcript.summary.keywords.length > 0) {
        markdown += `**Keywords:** ${transcript.summary.keywords.join(', ')}\n\n`;
      }

      if (transcript.summary.action_items && transcript.summary.action_items.length > 0) {
        markdown += `### Action Items\n`;
        transcript.summary.action_items.forEach(item => {
          markdown += `- ${item}\n`;
        });
        markdown += `\n`;
      }

      if (transcript.summary.questions && transcript.summary.questions.length > 0) {
        markdown += `### Key Questions\n`;
        transcript.summary.questions.forEach(q => {
          markdown += `- ${q}\n`;
        });
        markdown += `\n`;
      }
    }

    markdown += `## Transcript\n\n`;

    // Format sentences into readable transcript
    if (transcript.sentences && transcript.sentences.length > 0) {
      let currentSpeaker = null;
      let currentParagraph = [];

      transcript.sentences.forEach(sentence => {
        if (sentence.speaker_name !== currentSpeaker) {
          if (currentParagraph.length > 0) {
            markdown += `**${currentSpeaker}:** ${currentParagraph.join(' ')}\n\n`;
          }
          currentSpeaker = sentence.speaker_name;
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

  // Extract metadata for categorization
  extractMetadata(transcript) {
    const metadata = {
      category: 'general', // Default category
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
    } else if (titleLower.includes('interview')) {
      metadata.category = 'interview';
    } else if (titleLower.includes('client') || titleLower.includes('customer')) {
      metadata.category = 'client';
    }

    // Extract keywords as tags
    if (transcript.summary && transcript.summary.keywords) {
      metadata.tags = transcript.summary.keywords.slice(0, 10); // Limit to 10 tags
    }

    // Try to extract project name from title (customize this based on your naming conventions)
    const projectMatch = transcript.title.match(/\[([^\]]+)\]/);
    if (projectMatch) {
      metadata.project = projectMatch[1];
    }

    // Department detection from participants
    if (transcript.participants) {
      const emails = transcript.participants.map(p => p.email).filter(Boolean);
      // Customize based on your email domain patterns
      if (emails.some(e => e.includes('engineering'))) {
        metadata.department = 'Engineering';
      } else if (emails.some(e => e.includes('sales'))) {
        metadata.department = 'Sales';
      } else if (emails.some(e => e.includes('marketing'))) {
        metadata.department = 'Marketing';
      }
    }

    return metadata;
  }
}