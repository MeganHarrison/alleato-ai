const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY || 'YOUR_NOTION_API_KEY',
});

async function checkNotionProjects() {
  const databaseId = '18fee3c6-d996-8192-a666-fe6b55e99f52';
  
  try {
    // Get all projects from Notion
    let allProjects = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: nextCursor,
        page_size: 100,
      });

      allProjects = allProjects.concat(response.results);
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
    }

    console.log(`Total projects in Notion: ${allProjects.length}`);
    console.log('\nFirst 10 projects:');
    console.log('==================');
    
    allProjects.slice(0, 10).forEach((page, index) => {
      if ('properties' in page) {
        const props = page.properties;
        const projectName = props['Project name']?.title?.[0]?.plain_text || 'Untitled';
        const jobNumber = props['Job #']?.rich_text?.[0]?.plain_text || 'No Job #';
        const phase = props['Phase']?.status?.name || 'No Phase';
        const revenue = props['Est Revenue']?.number || 0;
        
        console.log(`${index + 1}. ${projectName}`);
        console.log(`   Job #: ${jobNumber}`);
        console.log(`   Phase: ${phase}`);
        console.log(`   Est Revenue: $${revenue.toLocaleString()}`);
        console.log(`   Notion ID: ${page.id}`);
        console.log('');
      }
    });

    // Check for test projects
    const testProjects = allProjects.filter(page => {
      if ('properties' in page) {
        const name = page.properties['Project name']?.title?.[0]?.plain_text || '';
        return name.toLowerCase().includes('test') || 
               name.toLowerCase().includes('demo') ||
               name.toLowerCase().includes('sample');
      }
      return false;
    });

    if (testProjects.length > 0) {
      console.log(`\nFound ${testProjects.length} test/demo projects:`);
      testProjects.forEach(page => {
        if ('properties' in page) {
          const name = page.properties['Project name']?.title?.[0]?.plain_text || '';
          console.log(`  - ${name} (ID: ${page.id})`);
        }
      });
    }

    // Summary by phase
    const phaseCount = {};
    allProjects.forEach(page => {
      if ('properties' in page) {
        const phase = page.properties['Phase']?.status?.name || 'No Phase';
        phaseCount[phase] = (phaseCount[phase] || 0) + 1;
      }
    });

    console.log('\nProjects by Phase:');
    Object.entries(phaseCount).forEach(([phase, count]) => {
      console.log(`  ${phase}: ${count}`);
    });

  } catch (error) {
    console.error('Error checking Notion projects:', error.message);
  }
}

checkNotionProjects();