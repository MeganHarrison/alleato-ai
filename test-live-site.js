const { chromium } = require('playwright');

async function testLiveSite() {
  console.log('🚀 Starting comprehensive test of https://asrsfireprotection.com');
  
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
  
  // Collect network errors
  const networkErrors = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()} - ${response.url()}`);
    }
  });
  
  const results = {
    apiEndpoints: {},
    pages: {},
    dataDisplay: {},
    errors: {
      console: [],
      network: []
    }
  };
  
  try {
    console.log('\n📡 Testing API Endpoints...');
    
    // Test API endpoints
    const apiEndpoints = [
      '/api/projects',
      '/api/meetings', 
      '/api/clients',
      '/api/sync-status',
      '/api/documents',
      '/api/user'
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Testing ${endpoint}...`);
        const response = await page.request.get(`https://asrsfireprotection.com${endpoint}`);
        const status = response.status();
        let data = null;
        
        try {
          data = await response.json();
        } catch (e) {
          data = await response.text();
        }
        
        results.apiEndpoints[endpoint] = {
          status,
          working: status === 200,
          hasData: data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0),
          dataPreview: typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200)
        };
        
        console.log(`  ✅ ${endpoint}: ${status} - ${results.apiEndpoints[endpoint].hasData ? 'Has data' : 'No data'}`);
      } catch (error) {
        results.apiEndpoints[endpoint] = {
          status: 'ERROR',
          working: false,
          error: error.message
        };
        console.log(`  ❌ ${endpoint}: ERROR - ${error.message}`);
      }
    }
    
    console.log('\n🌐 Testing Page Navigation...');
    
    // Test page navigation
    const pages = [
      '/',
      '/tables/projects',
      '/meetings-list', 
      '/projects-dashboard',
      '/sync-status',
      '/dashboard'
    ];
    
    for (const pagePath of pages) {
      try {
        console.log(`Testing page ${pagePath}...`);
        const response = await page.goto(`https://asrsfireprotection.com${pagePath}`, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // Wait a bit for React to render
        await page.waitForTimeout(3000);
        
        const title = await page.title();
        const status = response.status();
        
        // Check for common error indicators
        const hasErrorText = await page.locator('text=Error').count() > 0;
        const has404Text = await page.locator('text=404').count() > 0;
        const has500Text = await page.locator('text=500').count() > 0;
        
        results.pages[pagePath] = {
          status,
          title,
          working: status === 200 && !hasErrorText && !has404Text && !has500Text,
          hasErrorIndicators: hasErrorText || has404Text || has500Text
        };
        
        console.log(`  ✅ ${pagePath}: ${status} - "${title}"`);
      } catch (error) {
        results.pages[pagePath] = {
          status: 'ERROR',
          working: false,
          error: error.message
        };
        console.log(`  ❌ ${pagePath}: ERROR - ${error.message}`);
      }
    }
    
    console.log('\n📊 Testing Data Display...');
    
    // Test specific data display pages
    const dataPages = [
      { path: '/tables/projects', selector: 'table, [data-testid*="table"], .table, [class*="table"]', name: 'Projects Table' },
      { path: '/meetings-list', selector: '[class*="meeting"], .meeting, [data-testid*="meeting"], li, .list-item', name: 'Meetings List' },
      { path: '/projects-dashboard', selector: '[class*="project"], .project, [class*="dashboard"], .dashboard', name: 'Projects Dashboard' },
      { path: '/dashboard', selector: '[class*="dashboard"], .dashboard, [class*="card"], .card', name: 'Main Dashboard' }
    ];
    
    for (const dataPage of dataPages) {
      try {
        console.log(`Testing data display on ${dataPage.path}...`);
        await page.goto(`https://asrsfireprotection.com${dataPage.path}`, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // Wait for content to load
        await page.waitForTimeout(5000);
        
        // Check for loading indicators
        const hasLoadingSpinner = await page.locator('[class*="loading"], [class*="spinner"], .loading, .spinner').count() > 0;
        const hasLoadingText = await page.locator('text=Loading').count() > 0;
        const hasLoadingIndicators = hasLoadingSpinner || hasLoadingText;
        
        // Check for data elements
        const dataElements = await page.locator(dataPage.selector).count();
        
        // Check for "no data" messages
        const hasNoDataMessage = await page.locator('text=No data, text=No projects, text=No meetings, text=Empty').count() > 0;
        
        // Get visible text content to check if there's actual data
        const pageText = await page.textContent('body');
        const hasSubstantialContent = pageText && pageText.length > 500;
        
        results.dataDisplay[dataPage.path] = {
          name: dataPage.name,
          hasLoadingIndicators,
          dataElementsCount: dataElements,
          hasNoDataMessage,
          hasSubstantialContent,
          working: !hasLoadingIndicators && (dataElements > 0 || hasSubstantialContent) && !hasNoDataMessage
        };
        
        console.log(`  📊 ${dataPage.name}: ${dataElements} data elements, ${hasSubstantialContent ? 'substantial content' : 'minimal content'}`);
      } catch (error) {
        results.dataDisplay[dataPage.path] = {
          name: dataPage.name,
          working: false,
          error: error.message
        };
        console.log(`  ❌ ${dataPage.name}: ERROR - ${error.message}`);
      }
    }
    
    // Collect final errors
    results.errors.console = consoleErrors;
    results.errors.network = networkErrors;
    
  } finally {
    await browser.close();
  }
  
  // Generate comprehensive report
  console.log('\n' + '='.repeat(60));
  console.log('🔍 COMPREHENSIVE SITE TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n📡 API ENDPOINTS:');
  let apiWorking = 0;
  let apiTotal = 0;
  for (const [endpoint, result] of Object.entries(results.apiEndpoints)) {
    apiTotal++;
    const status = result.working ? '✅' : '❌';
    console.log(`${status} ${endpoint}: ${result.status}${result.hasData ? ' (Has Data)' : ' (No Data)'}`);
    if (result.working) apiWorking++;
    if (result.error) console.log(`    Error: ${result.error}`);
  }
  
  console.log('\n🌐 PAGE NAVIGATION:');
  let pagesWorking = 0;
  let pagesTotal = 0;
  for (const [pagePath, result] of Object.entries(results.pages)) {
    pagesTotal++;
    const status = result.working ? '✅' : '❌';
    console.log(`${status} ${pagePath}: ${result.status} - "${result.title}"`);
    if (result.working) pagesWorking++;
    if (result.error) console.log(`    Error: ${result.error}`);
  }
  
  console.log('\n📊 DATA DISPLAY:');
  let dataWorking = 0;
  let dataTotal = 0;
  for (const [path, result] of Object.entries(results.dataDisplay)) {
    dataTotal++;
    const status = result.working ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.dataElementsCount} elements${result.hasLoadingIndicators ? ' (Still Loading)' : ''}`);
    if (result.working) dataWorking++;
    if (result.error) console.log(`    Error: ${result.error}`);
  }
  
  console.log('\n🚨 ERRORS DETECTED:');
  if (results.errors.console.length > 0) {
    console.log('Console Errors:');
    results.errors.console.forEach(error => console.log(`  - ${error}`));
  }
  if (results.errors.network.length > 0) {
    console.log('Network Errors:');
    results.errors.network.forEach(error => console.log(`  - ${error}`));
  }
  if (results.errors.console.length === 0 && results.errors.network.length === 0) {
    console.log('✅ No errors detected!');
  }
  
  console.log('\n📈 OVERALL HEALTH ASSESSMENT:');
  const apiHealth = apiTotal > 0 ? (apiWorking / apiTotal * 100).toFixed(1) : '0';
  const pageHealth = pagesTotal > 0 ? (pagesWorking / pagesTotal * 100).toFixed(1) : '0';
  const dataHealth = dataTotal > 0 ? (dataWorking / dataTotal * 100).toFixed(1) : '0';
  
  console.log(`API Endpoints: ${apiWorking}/${apiTotal} working (${apiHealth}%)`);
  console.log(`Page Navigation: ${pagesWorking}/${pagesTotal} working (${pageHealth}%)`);
  console.log(`Data Display: ${dataWorking}/${dataTotal} working (${dataHealth}%)`);
  
  const overallHealth = ((apiWorking + pagesWorking + dataWorking) / (apiTotal + pagesTotal + dataTotal) * 100).toFixed(1);
  console.log(`\n🎯 OVERALL SITE HEALTH: ${overallHealth}%`);
  
  if (overallHealth >= 90) {
    console.log('🟢 EXCELLENT - Site is functioning well');
  } else if (overallHealth >= 70) {
    console.log('🟡 GOOD - Site is mostly functional with minor issues');
  } else if (overallHealth >= 50) {
    console.log('🟠 FAIR - Site has significant issues that need attention');
  } else {
    console.log('🔴 POOR - Site has major functionality problems');
  }
  
  return results;
}

// Run the test
testLiveSite().catch(console.error);