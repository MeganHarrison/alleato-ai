const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY || 'YOUR_NOTION_API_KEY',
});

async function listDatabases() {
  console.log('Searching for databases in your Notion workspace...\n');
  
  try {
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      },
      page_size: 100
    });

    console.log(`Found ${response.results.length} databases:\n`);
    
    response.results.forEach((db, index) => {
      console.log(`${index + 1}. ${db.title[0]?.plain_text || 'Untitled'}`);
      console.log(`   ID: ${db.id}`);
      console.log(`   URL: ${db.url}`);
      console.log(`   Created: ${db.created_time}`);
      console.log('');
    });

    // Look for the actual projects database
    const projectsDb = response.results.find(db => 
      db.title[0]?.plain_text?.toLowerCase().includes('project') &&
      !db.title[0]?.plain_text?.toLowerCase().includes('demo') &&
      !db.title[0]?.plain_text?.toLowerCase().includes('test')
    );

    if (projectsDb) {
      console.log('='.repeat(50));
      console.log('Likely main projects database:');
      console.log(`Name: ${projectsDb.title[0]?.plain_text}`);
      console.log(`ID: ${projectsDb.id}`);
      console.log(`URL: ${projectsDb.url}`);
    }

  } catch (error) {
    console.error('Error listing databases:', error.message);
  }
}

listDatabases();