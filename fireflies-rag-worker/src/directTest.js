// Direct test endpoint for debugging
export async function testFirefliesDirectly(env) {
  const apiKey = env.FIREFLIES_API_KEY;
  
  try {
    // Test 1: Basic query
    const query1 = `{
      transcripts(limit: 1, skip: 0) {
        id
        title
        date
        duration
      }
    }`;
    
    console.log('Sending query:', query1);
    
    const response1 = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ query: query1 })
    });
    
    const text1 = await response1.text();
    console.log('Raw response:', text1);
    
    const data1 = JSON.parse(text1);
    
    if (!data1.data || !data1.data.transcripts) {
      return { error: 'No transcripts found', data: data1 };
    }
    
    const transcriptId = data1.data.transcripts[0].id;
    
    // Test 2: Get detailed transcript
    const query2 = `{
      transcript(id: "${transcriptId}") {
        id
        title
        date
        duration
        sentences {
          text
          speaker_name
          start_time
          end_time
        }
      }
    }`;
    
    const response2 = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ query: query2 })
    });
    
    const data2 = await response2.json();
    
    return {
      success: true,
      transcript: data2.data.transcript,
      sentenceCount: data2.data.transcript.sentences ? data2.data.transcript.sentences.length : 0
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}