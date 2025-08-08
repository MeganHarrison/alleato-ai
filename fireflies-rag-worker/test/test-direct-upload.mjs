import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function directUploadTranscript() {
  const transcriptPath = path.join(__dirname, 'fireflies-transcripts/transcripts/2025-07-11 - PowerHIVE Overview (Alleato Group - Concentric).md');
  const transcript = fs.readFileSync(transcriptPath, 'utf8');
  
  // Extract meeting ID from the transcript
  const meetingIdMatch = transcript.match(/\*\*Meeting ID\*\*: ([A-Z0-9]+)/);
  const meetingId = meetingIdMatch ? meetingIdMatch[1] : 'TEST123';
  
  // Extract date
  const dateMatch = transcript.match(/\*\*Date\*\*: (\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : '2025-07-11';
  
  // Extract title
  const titleMatch = transcript.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Test Meeting';
  
  console.log('Uploading transcript for:', title);
  console.log('Meeting ID:', meetingId);
  console.log('Date:', date);
  
  try {
    // First, store the meeting in the database
    const storeResponse = await fetch('https://fireflies-rag-worker.megan-d14.workers.dev/test-store-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: meetingId,
        fireflies_id: meetingId,
        title: title,
        date: date,
        transcript: transcript,
        attendees: ['evin.sisemore@concentricusa.com', 'acannon@alleatogroup.com'],
        duration: 1845 // 30.75 minutes in seconds
      })
    });
    
    const storeResult = await storeResponse.text();
    console.log('Store response status:', storeResponse.status);
    console.log('Store response:', storeResult);
    
    // Then process it for vectorization
    if (storeResponse.ok) {
      const processResponse = await fetch('https://fireflies-rag-worker.megan-d14.workers.dev/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: meetingId
        })
      });
      
      const processResult = await processResponse.text();
      console.log('Process response status:', processResponse.status);
      console.log('Process response:', processResult);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

directUploadTranscript();