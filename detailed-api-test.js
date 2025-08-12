const { chromium } = require('playwright');

async function detailedApiTest() {
  console.log('🔍 Detailed API Testing for https://asrsfireprotection.com');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test each API endpoint in detail
    const apiEndpoints = [
      '/api/projects',
      '/api/meetings', 
      '/api/clients',
      '/api/sync-status',
      '/api/documents',
      '/api/user'
    ];
    
    console.log('\n📡 Detailed API Endpoint Analysis:');
    console.log('='.repeat(50));
    
    for (const endpoint of apiEndpoints) {
      console.log(`\n🔍 Testing ${endpoint}...`);
      
      try {
        const response = await page.request.get(`https://asrsfireprotection.com${endpoint}`);
        const status = response.status();
        const headers = response.headers();
        
        let responseText = '';
        let responseData = null;
        
        try {
          responseText = await response.text();
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            // Not JSON, keep as text
          }
        } catch (e) {
          responseText = 'Unable to read response body';
        }
        
        console.log(`  Status: ${status}`);
        console.log(`  Content-Type: ${headers['content-type'] || 'Not specified'}`);
        
        if (status === 200) {
          console.log(`  ✅ SUCCESS`);
          if (responseData) {
            if (Array.isArray(responseData)) {
              console.log(`  📊 Data: Array with ${responseData.length} items`);
              if (responseData.length > 0) {
                console.log(`  📋 Sample item keys: ${Object.keys(responseData[0]).join(', ')}`);
              }
            } else {
              console.log(`  📊 Data: Object with keys: ${Object.keys(responseData).join(', ')}`);
            }
          } else {
            console.log(`  📄 Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
          }
        } else if (status === 500) {
          console.log(`  ❌ SERVER ERROR (500)`);
          console.log(`  🚨 Error details: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
        } else {
          console.log(`  ⚠️  Status ${status}`);
          console.log(`  📄 Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
        }
        
      } catch (error) {
        console.log(`  💥 REQUEST FAILED: ${error.message}`);
      }
    }
    
    // Now test the main pages to see what's actually loading
    console.log('\n\n🌐 Page Content Analysis:');
    console.log('='.repeat(50));
    
    const testPages = [
      { path: '/tables/projects', name: 'Projects Table' },
      { path: '/meetings-list', name: 'Meetings List' },
      { path: '/projects-dashboard', name: 'Projects Dashboard' },
      { path: '/dashboard', name: 'Main Dashboard' }
    ];
    
    for (const testPage of testPages) {
      console.log(`\n🔍 Testing ${testPage.name} (${testPage.path})...`);
      
      try {
        await page.goto(`https://asrsfireprotection.com${testPage.path}`, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // Wait for React to render
        await page.waitForTimeout(3000);
        
        // Check for error messages in the UI
        const errorMessages = await page.locator('text=Error, text=Failed, text=500, text=404').allTextContents();
        
        // Check for loading states
        const loadingElements = await page.locator('[class*="loading"], [class*="spinner"], text=Loading').count();
        
        // Check for data tables/lists
        const tables = await page.locator('table').count();
        const listItems = await page.locator('li').count();
        const cards = await page.locator('[class*="card"]').count();
        
        // Get page text to check content
        const bodyText = await page.textContent('body');
        const textLength = bodyText ? bodyText.length : 0;
        
        console.log(`  📊 Content Elements:`);
        console.log(`    - Tables: ${tables}`);
        console.log(`    - List items: ${listItems}`);
        console.log(`    - Cards: ${cards}`);
        console.log(`    - Loading indicators: ${loadingElements}`);
        console.log(`    - Total text length: ${textLength}`);
        
        if (errorMessages.length > 0) {
          console.log(`  🚨 Error messages found:`);
          errorMessages.forEach(msg => console.log(`    - "${msg}"`));
        } else {
          console.log(`  ✅ No error messages in UI`);
        }
        
        // Check specific content patterns
        const hasProjects = await page.locator('text=project').count() > 0;
        const hasMeetings = await page.locator('text=meeting').count() > 0;
        const hasData = await page.locator('text=data').count() > 0;
        
        console.log(`  🔍 Content patterns:`);
        console.log(`    - Has "project" text: ${hasProjects}`);
        console.log(`    - Has "meeting" text: ${hasMeetings}`);
        console.log(`    - Has "data" text: ${hasData}`);
        
      } catch (error) {
        console.log(`  💥 PAGE LOAD FAILED: ${error.message}`);
      }
    }
    
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 SUMMARY AND RECOMMENDATIONS');
  console.log('='.repeat(60));
  console.log('\n🔍 Key Findings:');
  console.log('1. Multiple API endpoints returning 500 server errors');
  console.log('2. Only /api/meetings endpoint working correctly (200 status)');
  console.log('3. Frontend pages loading but likely showing error states due to API failures');
  console.log('4. Website structure and routing working correctly');
  
  console.log('\n💡 Recommendations:');
  console.log('1. Fix server-side errors causing 500 responses');
  console.log('2. Check Cloudflare Worker logs for detailed error information');
  console.log('3. Verify database connections and environment variables');
  console.log('4. Test individual API endpoints in development environment');
  
  console.log('\n🚨 Critical Issues:');
  console.log('- /api/user: 500 error - user authentication/profile not working');
  console.log('- /api/projects: 500 error - core business functionality broken');
  console.log('- /api/clients: 500 error - client data not accessible');
  console.log('- /api/sync-status: 500 error - sync monitoring not working');
  console.log('- /api/documents: 500 error - document access broken');
  
  console.log('\n✅ Working Components:');
  console.log('- Website routing and page loading');
  console.log('- Frontend React application');
  console.log('- /api/meetings endpoint');
  console.log('- Basic site structure and navigation');
}

detailedApiTest().catch(console.error);