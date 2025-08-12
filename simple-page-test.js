const { chromium } = require('playwright');

async function simplePageTest() {
  console.log('🌐 Simple Page Content Test for https://asrsfireprotection.com');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  try {
    const testPages = [
      { path: '/tables/projects', name: 'Projects Table' },
      { path: '/meetings-list', name: 'Meetings List' },
      { path: '/projects-dashboard', name: 'Projects Dashboard' },
      { path: '/dashboard', name: 'Main Dashboard' }
    ];
    
    for (const testPage of testPages) {
      console.log(`\n🔍 Testing ${testPage.name} (${testPage.path})...`);
      
      try {
        const response = await page.goto(`https://asrsfireprotection.com${testPage.path}`, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        console.log(`  Status: ${response.status()}`);
        
        // Wait for React to render
        await page.waitForTimeout(5000);
        
        // Check for basic UI elements
        const hasTable = await page.locator('table').count() > 0;
        const hasListItems = await page.locator('li').count() > 0;
        const hasCards = await page.locator('[class*="card"], .card').count() > 0;
        const hasLoadingText = await page.locator('text=Loading').count() > 0;
        const hasErrorText = await page.locator('text=Error').count() > 0;
        
        // Get page content
        const bodyText = await page.textContent('body');
        const textLength = bodyText ? bodyText.length : 0;
        
        // Check for specific text patterns
        const hasProjectText = bodyText && bodyText.toLowerCase().includes('project');
        const hasMeetingText = bodyText && bodyText.toLowerCase().includes('meeting');
        const hasDataText = bodyText && bodyText.toLowerCase().includes('data');
        const hasNoDataText = bodyText && (bodyText.toLowerCase().includes('no data') || bodyText.toLowerCase().includes('no projects') || bodyText.toLowerCase().includes('no meetings'));
        
        console.log(`  📊 Page Analysis:`);
        console.log(`    - Page loads: ✅ (${response.status()})`);
        console.log(`    - Has table: ${hasTable ? '✅' : '❌'}`);
        console.log(`    - Has list items: ${hasListItems ? '✅' : '❌'}`);
        console.log(`    - Has cards: ${hasCards ? '✅' : '❌'}`);
        console.log(`    - Shows loading: ${hasLoadingText ? '⏳' : '❌'}`);
        console.log(`    - Shows errors: ${hasErrorText ? '🚨' : '✅'}`);
        console.log(`    - Text length: ${textLength} chars`);
        console.log(`    - Has project content: ${hasProjectText ? '✅' : '❌'}`);
        console.log(`    - Has meeting content: ${hasMeetingText ? '✅' : '❌'}`);
        console.log(`    - Has data content: ${hasDataText ? '✅' : '❌'}`);
        console.log(`    - Shows "no data": ${hasNoDataText ? '⚠️' : '✅'}`);
        
        // Take a screenshot for visual inspection
        await page.screenshot({ 
          path: `screenshot-${testPage.path.replace(/\//g, '-')}.png`,
          fullPage: true 
        });
        console.log(`    - Screenshot saved: screenshot-${testPage.path.replace(/\//g, '-')}.png`);
        
        // Show a snippet of the actual content
        if (bodyText && textLength > 100) {
          const snippet = bodyText.substring(0, 300).replace(/\s+/g, ' ').trim();
          console.log(`    - Content preview: "${snippet}..."`);
        }
        
      } catch (error) {
        console.log(`  💥 FAILED: ${error.message}`);
      }
    }
    
    console.log(`\n🚨 Console Errors Found: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 10).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      if (consoleErrors.length > 10) {
        console.log(`  ... and ${consoleErrors.length - 10} more errors`);
      }
    }
    
  } finally {
    await browser.close();
  }
}

simplePageTest().catch(console.error);