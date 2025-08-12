const { chromium } = require('playwright');

async function testSidebarNavigation() {
  console.log('🧪 Testing sidebar navigation at http://localhost:3008/dashboard');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for better visibility
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport for consistent screenshot
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Enable console logging to debug any issues
    page.on('console', msg => console.log('Browser:', msg.text()));
    page.on('pageerror', err => console.error('Page Error:', err));
    
    // Navigate to dashboard
    console.log('📍 Navigating to http://localhost:3008/dashboard...');
    const response = await page.goto('http://localhost:3008/dashboard', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (!response.ok()) {
      throw new Error(`Page returned ${response.status()}: ${response.statusText()}`);
    }
    
    // Wait for the sidebar to be visible
    console.log('⏳ Waiting for sidebar to load...');
    await page.waitForSelector('[data-sidebar="sidebar"]', { timeout: 10000 });
    
    // Check for each navigation section
    const sections = [
      {
        name: 'Core Features',
        items: ['Dashboard', 'AI Assistant', 'Search & RAG']
      },
      {
        name: 'Data Tables', 
        items: ['Projects', 'Meetings', 'Documents', 'Clients', 'Reports']
      },
      {
        name: 'Developer Docs',
        items: ['Database Schema', 'API Documentation', 'Workers', 'Site Map']
      },
      {
        name: 'Account',
        items: ['Profile', 'Settings', 'Billing', 'Notifications', 'Sign Out']
      }
    ];
    
    console.log('🔍 Verifying navigation sections...');
    
    // Expand all sections if they're collapsible
    const collapsibleTriggers = await page.locator('[data-state="closed"]').all();
    for (const trigger of collapsibleTriggers) {
      await trigger.click();
      await page.waitForTimeout(500); // Wait for animation
    }
    
    // Check each section
    for (const section of sections) {
      console.log(`✓ Checking ${section.name} section...`);
      
      // Look for section heading (could be in different formats)
      const sectionHeading = page.locator(`text="${section.name}"`).first();
      const isVisible = await sectionHeading.isVisible().catch(() => false);
      
      if (isVisible) {
        console.log(`  ✅ Found ${section.name} section`);
        
        // Check for items in this section
        for (const item of section.items) {
          const itemElement = page.locator(`text="${item}"`).first();
          const itemVisible = await itemElement.isVisible().catch(() => false);
          
          if (itemVisible) {
            console.log(`    ✅ Found ${item}`);
          } else {
            console.log(`    ⚠️  Missing ${item}`);
          }
        }
      } else {
        console.log(`  ❌ Missing ${section.name} section`);
      }
    }
    
    // Take a full screenshot of the page
    console.log('📸 Taking screenshot...');
    await page.screenshot({ 
      path: '/Users/meganharrison/Documents/github/alleato-ai/sidebar-navigation-test.png',
      fullPage: true 
    });
    
    // Take a focused screenshot of just the sidebar
    const sidebar = page.locator('[data-sidebar="sidebar"]').first();
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({ 
        path: '/Users/meganharrison/Documents/github/alleato-ai/sidebar-only-test.png'
      });
      console.log('📸 Sidebar screenshot saved as sidebar-only-test.png');
    }
    
    console.log('📸 Full page screenshot saved as sidebar-navigation-test.png');
    
    // Get the page title for verification
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    console.log('✅ Sidebar navigation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testSidebarNavigation().catch(console.error);