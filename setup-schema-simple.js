/**
 * Run schema setup via API
 */

const API_URL = 'https://alleato-comprehensive-api.megan-d14.workers.dev';

async function setupSchema() {
  console.log('🔧 Setting up database schema...\n');
  
  try {
    const response = await fetch(`${API_URL}/api/setup-schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Schema setup successful!');
      console.log(`   Message: ${data.message}`);
    } else {
      console.error('❌ Schema setup failed:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the setup
setupSchema();