const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Listen to console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Navigate to the meetings list page
  await page.goto('http://localhost:3003/meetings-list');
  
  // Wait for a moment to let the API call complete
  await page.waitForTimeout(5000);
  
  // Check what's displayed
  const title = await page.textContent('h1');
  const subtitle = await page.textContent('p.text-gray-600');
  
  console.log('Page Title:', title);
  console.log('Subtitle:', subtitle);
  
  // Check if there are any meeting items displayed
  const meetingItems = await page.$$('[data-test-id="meeting-item"]');
  console.log('Meeting items found:', meetingItems.length);
  
  // Look for meeting sections by month
  const monthSections = await page.$$('h2.text-lg.font-semibold');
  console.log('Month sections found:', monthSections.length);
  for (let section of monthSections) {
    const text = await section.textContent();
    console.log('Month section:', text);
  }
  
  // Look for individual meeting divs
  const meetingDivs = await page.$$('div.flex.items-center.gap-3.p-2');
  console.log('Meeting divs found:', meetingDivs.length);
  
  // Extract meeting titles
  for (let i = 0; i < meetingDivs.length; i++) {
    const titleElement = await meetingDivs[i].$('div.flex-1.text-sm.font-medium.truncate');
    if (titleElement) {
      const title = await titleElement.textContent();
      console.log(`Meeting ${i + 1} title:`, title);
    }
  }
  
  // Check for "No meetings found" text
  const noMeetingsText = await page.$('text=No meetings found');
  console.log('No meetings text present:', noMeetingsText !== null);
  
  // Check for loading spinner
  const loadingSpinner = await page.$('.animate-spin');
  console.log('Loading spinner present:', loadingSpinner !== null);
  
  await browser.close();
})();