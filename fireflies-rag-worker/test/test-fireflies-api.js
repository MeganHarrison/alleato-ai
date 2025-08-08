// Test Fireflies API directly
const apiKey = '1d590920-152d-408b-a829-14489ef07538';

async function testAPI() {
  console.log('Testing Fireflies API...\n');

  // Test 1: Simple query
  console.log('1. Testing simple query:');
  const response1 = await fetch('https://api.fireflies.ai/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query: '{ transcripts(limit: 1) { id title date } }'
    })
  });
  
  const data1 = await response1.json();
  console.log('Response:', JSON.stringify(data1, null, 2));

  if (data1.data && data1.data.transcripts && data1.data.transcripts.length > 0) {
    const transcriptId = data1.data.transcripts[0].id;
    console.log('\n2. Testing detailed transcript query for ID:', transcriptId);
    
    const response2 = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: `{
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
        }`
      })
    });
    
    const data2 = await response2.json();
    console.log('Transcript response:', JSON.stringify(data2, null, 2).substring(0, 500) + '...');
    
    if (data2.data && data2.data.transcript) {
      console.log('\nTranscript details:');
      console.log('- Title:', data2.data.transcript.title);
      console.log('- Duration:', data2.data.transcript.duration, 'seconds');
      console.log('- Sentences:', data2.data.transcript.sentences ? data2.data.transcript.sentences.length : 0);
    }
  }
}

testAPI().catch(console.error);