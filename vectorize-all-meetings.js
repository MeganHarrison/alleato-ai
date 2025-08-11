/**
 * Vectorize all meetings in the database
 * Processes meetings in batches to avoid overwhelming the API
 */

const API_URL = 'https://alleato-comprehensive-api.megan-d14.workers.dev';

// Configuration
const BATCH_SIZE = 5; // Process 5 meetings at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds between batches
const MAX_MEETINGS = null; // Process all meetings

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getUnvectorizedMeetings() {
  console.log('📊 Fetching unvectorized meetings...');
  
  const response = await fetch(`${API_URL}/api/vectorization-status`);
  const data = await response.json();
  
  if (!data.meetings) {
    console.error('❌ No meetings data received');
    return [];
  }
  
  // Filter for unvectorized meetings
  const unvectorized = data.meetings.filter(m => !m.vector_processed);
  console.log(`Found ${unvectorized.length} unvectorized meetings out of ${data.meetings.length} total\n`);
  
  return unvectorized;
}

async function vectorizeMeeting(meeting) {
  try {
    console.log(`  🧠 Vectorizing: ${meeting.title}`);
    console.log(`     Date: ${meeting.date} | ID: ${meeting.meeting_id}`);
    
    const response = await fetch(`${API_URL}/api/vectorize-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting_id: meeting.meeting_id })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`     ✅ Success! ${result.chunks} chunks | Project: ${result.project_matched ? 'Yes' : 'No'} | Client: ${result.client_matched ? 'Yes' : 'No'}`);
      return { success: true, chunks: result.chunks };
    } else {
      console.error(`     ❌ Failed: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error(`     ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function vectorizeAllMeetings() {
  console.log('🚀 Starting batch vectorization process...\n');
  
  // Get all unvectorized meetings
  const meetings = await getUnvectorizedMeetings();
  
  if (meetings.length === 0) {
    console.log('✅ All meetings are already vectorized!');
    return;
  }
  
  // Limit meetings if MAX_MEETINGS is set
  const meetingsToProcess = MAX_MEETINGS ? meetings.slice(0, MAX_MEETINGS) : meetings;
  console.log(`🎯 Will process ${meetingsToProcess.length} meetings in batches of ${BATCH_SIZE}\n`);
  
  // Process statistics
  let successCount = 0;
  let errorCount = 0;
  let totalChunks = 0;
  const startTime = Date.now();
  
  // Process in batches
  for (let i = 0; i < meetingsToProcess.length; i += BATCH_SIZE) {
    const batch = meetingsToProcess.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(meetingsToProcess.length / BATCH_SIZE);
    
    console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} meetings):`);
    
    // Process batch in parallel
    const results = await Promise.all(
      batch.map(meeting => vectorizeMeeting(meeting))
    );
    
    // Update statistics
    results.forEach(result => {
      if (result.success) {
        successCount++;
        totalChunks += result.chunks || 0;
      } else {
        errorCount++;
      }
    });
    
    // Progress update
    const processed = i + batch.length;
    const percentage = Math.round((processed / meetingsToProcess.length) * 100);
    console.log(`\n📈 Progress: ${processed}/${meetingsToProcess.length} (${percentage}%)`);
    console.log(`   ✅ Success: ${successCount} | ❌ Errors: ${errorCount} | 📄 Total chunks: ${totalChunks}`);
    
    // Delay between batches (except for the last batch)
    if (i + BATCH_SIZE < meetingsToProcess.length) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  // Final summary
  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log('\n' + '='.repeat(60));
  console.log('📊 VECTORIZATION COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Successfully vectorized: ${successCount} meetings`);
  console.log(`❌ Failed: ${errorCount} meetings`);
  console.log(`📄 Total chunks created: ${totalChunks}`);
  console.log(`⏱️  Total time: ${duration} seconds`);
  console.log(`📈 Average chunks per meeting: ${(totalChunks / successCount).toFixed(1)}`);
  
  if (MAX_MEETINGS && meetings.length > MAX_MEETINGS) {
    console.log(`\n💡 Note: This was a test run of ${MAX_MEETINGS} meetings.`);
    console.log(`   There are ${meetings.length - MAX_MEETINGS} more meetings to process.`);
    console.log(`   Set MAX_MEETINGS = null in the script to process all meetings.`);
  }
}

// Check if we should proceed
async function main() {
  console.log('🤖 Alleato AI - Meeting Vectorization Tool\n');
  
  if (MAX_MEETINGS) {
    console.log(`⚠️  TEST MODE: Will process only ${MAX_MEETINGS} meetings`);
    console.log('   Change MAX_MEETINGS to null to process all meetings\n');
  }
  
  console.log('This will:');
  console.log('1. Fetch all unvectorized meetings');
  console.log('2. Generate embeddings using OpenAI');
  console.log('3. Extract entities and match projects/clients');
  console.log('4. Store chunks in the database\n');
  
  console.log('Starting in 3 seconds...\n');
  await sleep(3000);
  
  await vectorizeAllMeetings();
}

// Run the vectorization
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});