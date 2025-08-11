/**
 * Run R2 to D1 sync
 */

const API_URL = 'https://alleato-comprehensive-api.megan-d14.workers.dev';

async function runSync() {
  console.log('🔄 Starting R2 to D1 sync...\n');
  
  try {
    const response = await fetch(`${API_URL}/api/sync-r2-to-d1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Sync completed successfully!');
      console.log(`   Total files: ${data.total}`);
      console.log(`   Synced: ${data.synced}`);
      console.log(`   Skipped: ${data.skipped}`);
      console.log(`   Errors: ${data.errors}`);
    } else {
      console.error('❌ Sync failed:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the sync
runSync();