const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY || 'YOUR_NOTION_API_KEY',
});

async function checkDatabase(databaseId, name) {
  console.log(`\nChecking ${name} database...`);
  console.log('='.repeat(50));
  
  try {
    // Get database schema
    const db = await notion.databases.retrieve({
      database_id: databaseId,
    });
    
    console.log('Properties:');
    Object.entries(db.properties).forEach(([key, prop]) => {
      console.log(`  - ${key} (${prop.type})`);
    });
    
    // Get sample data
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 3,
    });
    
    console.log(`\nFound ${response.results.length} items. Sample data:`);
    
    response.results.forEach((page, index) => {
      if ('properties' in page) {
        console.log(`\nItem ${index + 1}:`);
        const props = page.properties;
        
        // Try to find title property
        const titleProp = Object.entries(props).find(([_, p]) => p.type === 'title');
        if (titleProp) {
          const title = titleProp[1].title?.[0]?.plain_text || 'No title';
          console.log(`  Title: ${title}`);
        }
        
        // Show first few properties
        Object.entries(props).slice(0, 5).forEach(([key, prop]) => {
          let value = 'N/A';
          if (prop.type === 'rich_text' && prop.rich_text?.[0]) {
            value = prop.rich_text[0].plain_text;
          } else if (prop.type === 'number') {
            value = prop.number;
          } else if (prop.type === 'select') {
            value = prop.select?.name || 'N/A';
          } else if (prop.type === 'status') {
            value = prop.status?.name || 'N/A';
          }
          if (key !== titleProp?.[0]) {
            console.log(`  ${key}: ${value}`);
          }
        });
      }
    });
    
  } catch (error) {
    console.error(`Error checking ${name}:`, error.message);
  }
}

async function main() {
  // Check Internal Projects Alleato
  await checkDatabase('1ebee3c6-d996-808c-a9be-f531671f9d2d', 'Internal Projects Alleato');
  
  // Check current Projects database 
  await checkDatabase('18fee3c6-d996-8192-a666-fe6b55e99f52', 'Projects (Current)');
}

main();