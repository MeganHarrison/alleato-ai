/**
 * Check D1 database schema
 */

const API_URL = 'https://alleato-comprehensive-api.megan-d14.workers.dev';

async function checkSchema() {
  console.log('🔍 Checking D1 database schema...\n');
  
  // First, let's add an endpoint to check the schema
  const testSQL = `
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='meetings'
  `;
  
  // For now, let's use a custom query through the test endpoint
  console.log('Would need to add a schema check endpoint to the worker.');
  console.log('Based on the error, the meetings table is missing project_id and client_id columns.');
  console.log('\nWe need to either:');
  console.log('1. Add these columns to the existing meetings table');
  console.log('2. Use a different database that has the correct schema');
}

checkSchema();