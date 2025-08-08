// Test script to verify Fireflies sync functionality
const fetch = require('node-fetch');

// Test Fireflies API connection
async function testFirefliesAPI() {
  const FIREFLIES_API_KEY = process.env.FIREFLIES_API_KEY || '1d590920-152d-408b-a829-14489ef07538';
  
  const query = `
    query GetRecentTranscripts {
      transcripts(limit: 5) {
        id
        title
        date
        duration
        participants {
          name
          email
        }
      }
    }
  `;

  try {
    console.log('Testing Fireflies API connection...');
    const response = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIREFLIES_API_KEY}`
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('API Error:', data.errors);
      return false;
    }

    if (data.data && data.data.transcripts) {
      console.log(`✅ Successfully connected to Fireflies API`);
      console.log(`Found ${data.data.transcripts.length} recent transcripts:`);
      data.data.transcripts.forEach(t => {
        console.log(`- ${t.title} (${new Date(t.date).toLocaleDateString()})`);
      });
      return true;
    }
  } catch (error) {
    console.error('Connection error:', error.message);
    return false;
  }
}

// Test local worker endpoints
async function testWorkerEndpoints() {
  const workerUrl = 'http://localhost:8787';
  
  console.log('\nTesting worker endpoints...');
  
  // Test health check
  try {
    const healthResponse = await fetch(`${workerUrl}/test`);
    const healthData = await healthResponse.text();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test analytics
  try {
    const analyticsResponse = await fetch(`${workerUrl}/analytics`);
    const analyticsData = await analyticsResponse.json();
    console.log('✅ Analytics endpoint:', analyticsData);
  } catch (error) {
    console.log('❌ Analytics failed:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Testing Fireflies RAG Worker\n');
  
  // Test API connection
  const apiWorks = await testFirefliesAPI();
  
  if (apiWorks) {
    console.log('\n✅ Fireflies API is accessible and working!');
    console.log('The worker should be able to sync meetings successfully.');
  } else {
    console.log('\n❌ Fireflies API connection failed. Please check the API key.');
  }
  
  // Note about local testing
  console.log('\nTo test the worker locally:');
  console.log('1. Run: npm run dev');
  console.log('2. Visit: http://localhost:8787');
  console.log('3. Use the dashboard to trigger sync');
}

runTests();