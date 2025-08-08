const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY || 'YOUR_NOTION_API_KEY',
});

async function checkProjects() {
  const response = await notion.databases.query({
    database_id: '18fee3c6d9968192a666fe6b55e99f52',
    page_size: 5,
  });

  console.log('Sample projects from Notion:');
  console.log('----------------------------');
  
  response.results.forEach((page, index) => {
    if ('properties' in page) {
      const props = page.properties;
      const projectName = props['Project name']?.title?.[0]?.plain_text || 'No name';
      const jobNumber = props['Job #']?.rich_text?.[0]?.plain_text || 'No job #';
      const address = props['Address']?.rich_text?.[0]?.plain_text || 'No address';
      const revenue = props['Est Revenue']?.number || 0;
      
      console.log(`\nProject ${index + 1}:`);
      console.log(`  Page ID: ${page.id}`);
      console.log(`  Project name: ${projectName}`);
      console.log(`  Job #: ${jobNumber}`);
      console.log(`  Address: ${address}`);
      console.log(`  Est Revenue: ${revenue}`);
    }
  });
}

checkProjects().catch(console.error);