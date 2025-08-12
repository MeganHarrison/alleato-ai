import { SmartChunkingService } from './lib/services/smart-chunking';
import type { ExtractedEntity } from './lib/services/smart-chunking';

// Sample meeting transcript for testing
const sampleMeetingTranscript = `
[0:00] John Smith: Good morning everyone, let's start our project review meeting for the Port Collective initiative.

[0:15] Sarah Johnson: Thanks John. I'd like to begin by discussing our progress on the infrastructure redesign. We've completed 75% of the planned work and are on track to finish by next Friday.

[0:45] John Smith: That's excellent news. Are there any blockers or risks we should be aware of?

[1:00] Sarah Johnson: Yes, there's one concern. We're waiting on approval from the client for the final design changes. If we don't get it by Wednesday, it could delay our timeline by a week.

[1:30] Mike Chen: I can follow up with the client today. I'll schedule a call with them this afternoon.

[1:45] John Smith: Perfect, Mike. Let's make that an action item. Mike will contact the client today regarding design approval.

[2:00] Sarah Johnson: Moving on to budget. We're currently at 68% of our allocated budget, which aligns well with our 75% completion rate.

[2:30] Emily Davis: I have a question about the testing phase. When do we plan to start user acceptance testing?

[2:45] Sarah Johnson: Good question. UAT is scheduled to begin on March 15th, assuming we get the client approval this week.

[3:00] John Smith: Let's also make that a milestone. March 15th - Begin User Acceptance Testing.

[3:15] Mike Chen: I've identified a potential risk. Our lead developer mentioned that the new API integration might require additional security reviews, which weren't originally scoped.

[3:45] John Smith: That's important. Let's add that as a risk item and I'll discuss it with the security team tomorrow.

[4:00] Sarah Johnson: One more decision we need to make - should we proceed with the cloud migration in parallel or wait until after UAT?

[4:20] John Smith: Given our timeline, I think we should proceed in parallel. Does everyone agree?

[4:30] Mike Chen: Agreed.

[4:35] Emily Davis: Yes, that makes sense.

[4:40] John Smith: Great, it's decided. We'll proceed with cloud migration in parallel with UAT.

[5:00] Sarah Johnson: To summarize our action items: Mike will contact the client today, John will discuss security reviews with the team, and we'll proceed with parallel cloud migration.

[5:20] John Smith: Perfect summary. Let's reconvene next Tuesday to check on progress. Thanks everyone!
`;

async function testSmartChunking() {
  console.log('🧪 Testing Smart Chunking Service\n');
  console.log('='.repeat(60));
  
  try {
    // Initialize the chunking service
    const chunkingService = new SmartChunkingService({
      maxTokens: 500,
      minTokens: 50,
      overlapTokens: 50,
      targetTokens: 300,
    });
    
    // Process the sample meeting transcript
    console.log('📄 Processing sample meeting transcript...\n');
    const result = await chunkingService.processContent(
      sampleMeetingTranscript,
      'meeting'
    );
    
    // Display results
    console.log('✅ Chunking Complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Total Chunks: ${result.chunks.length}`);
    console.log(`  - Total Tokens: ${result.metadata.totalTokens}`);
    console.log(`  - Relationships: ${result.relationships.length}`);
    console.log(`  - Speakers: ${result.metadata.speakers?.join(', ') || 'None detected'}`);
    console.log('\n');
    
    // Display extracted entities
    console.log('🔍 Extracted Entities:');
    for (const [type, entities] of result.metadata.extractedEntities.entries()) {
      if (entities.length > 0) {
        console.log(`\n  ${type.toUpperCase()} (${entities.length}):`);
        entities.slice(0, 3).forEach((entity: ExtractedEntity) => {
          console.log(`    - ${entity.value} (confidence: ${(entity.confidence * 100).toFixed(0)}%)`);
        });
      }
    }
    console.log('\n');
    
    // Display timeline events
    if (result.metadata.timeline && result.metadata.timeline.length > 0) {
      console.log('📅 Timeline Events:');
      result.metadata.timeline.forEach(event => {
        console.log(`  - [${event.type}] ${event.description}`);
      });
      console.log('\n');
    }
    
    // Display chunks with details
    console.log('📦 Chunk Details:');
    result.chunks.forEach((chunk, index) => {
      console.log(`\n  Chunk ${index + 1}:`);
      console.log(`    - Type: ${chunk.type}`);
      console.log(`    - Speaker: ${chunk.speaker || 'N/A'}`);
      console.log(`    - Tokens: ${chunk.tokenCount}`);
      console.log(`    - Importance: ${(chunk.importance * 100).toFixed(0)}%`);
      console.log(`    - Topics: ${chunk.topics.join(', ')}`);
      console.log(`    - Entities: ${chunk.entities.length}`);
      console.log(`    - Content Preview: "${chunk.content.substring(0, 100)}..."`);
    });
    console.log('\n');
    
    // Display chunk relationships
    console.log('🔗 Chunk Relationships:');
    const relationshipTypes = new Map<string, number>();
    result.relationships.forEach(rel => {
      const count = relationshipTypes.get(rel.type) || 0;
      relationshipTypes.set(rel.type, count + 1);
    });
    
    for (const [type, count] of relationshipTypes.entries()) {
      console.log(`  - ${type}: ${count} relationships`);
    }
    console.log('\n');
    
    // Test specific features
    console.log('✨ Feature Tests:');
    
    // Test 1: Speaker detection
    const speakerChunks = result.chunks.filter(c => c.speaker);
    console.log(`  ✓ Speaker-aware chunking: ${speakerChunks.length} chunks with speakers`);
    
    // Test 2: Decision extraction
    const decisions = result.metadata.extractedEntities.get('decision') || [];
    console.log(`  ✓ Decision extraction: ${decisions.length} decisions found`);
    
    // Test 3: Action item extraction
    const actionItems = result.metadata.extractedEntities.get('action_item') || [];
    console.log(`  ✓ Action items: ${actionItems.length} action items found`);
    
    // Test 4: Risk identification
    const risks = result.metadata.extractedEntities.get('risk') || [];
    console.log(`  ✓ Risk detection: ${risks.length} risks identified`);
    
    // Test 5: Context preservation
    const chunksWithContext = result.chunks.filter(c => c.contextBefore || c.contextAfter);
    console.log(`  ✓ Context preservation: ${chunksWithContext.length} chunks with context`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
  }
}

// Run the test
testSmartChunking().catch(console.error);