const { chromium } = require('playwright');

async function testSidebarSimple() {
  console.log('🧪 Testing sidebar navigation at http://localhost:3008/dashboard');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('📍 Navigating to dashboard...');
    await page.goto('http://localhost:3008/dashboard', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for page to be stable
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see what's on the page
    await page.screenshot({ 
      path: '/Users/meganharrison/Documents/github/alleato-ai/dashboard-current-state.png',
      fullPage: true 
    });
    
    console.log('📸 Screenshot saved as dashboard-current-state.png');
    
    // Look for the sidebar with different selectors
    const sidebarSelectors = [
      'aside',
      '.sidebar',
      '[class*="sidebar"]',
      'nav',
      '[role="navigation"]'
    ];
    
    let sidebarFound = false;
    for (const selector of sidebarSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`✅ Found sidebar with selector: ${selector}`);
          
          // Take a screenshot of just this element
          await element.screenshot({ 
            path: `/Users/meganharrison/Documents/github/alleato-ai/sidebar-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png`
          });
          
          sidebarFound = true;
          
          // Get the text content to verify sections
          const text = await element.textContent();
          console.log('📄 Sidebar content preview:', text.substring(0, 500) + '...');
          
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!sidebarFound) {
      console.log('❌ No sidebar found with any common selectors');
      
      // Let's see what elements are on the page
      const bodyText = await page.locator('body').textContent();
      console.log('🔍 Page content preview:', bodyText.substring(0, 500) + '...');
    }
    
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testSidebarSimple().catch(console.error);