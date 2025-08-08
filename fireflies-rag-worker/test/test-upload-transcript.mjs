import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadTranscript() {
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
  
  const payload = {
    id: meetingId,
    fireflies_id: meetingId,
    title: title,
    date: date + 'T00:00:00Z',
    transcript: transcript,
    attendees: ['evin.sisemore@concentricusa.com', 'acannon@alleatogroup.com'],
    duration: 1845 // 30.75 minutes in seconds
  };
  
  console.log('Uploading transcript for:', title);
  console.log('Meeting ID:', meetingId);
  
  try {
    const response = await fetch('https://fireflies-rag-worker.megan-d14.workers.dev/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'transcription.completed',
        transcriptId: meetingId,
        data: payload
      })
    });
    
    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error uploading transcript:', error);
  }
}

uploadTranscript();