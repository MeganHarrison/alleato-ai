const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY || 'YOUR_NOTION_API_KEY',
});

async function checkClientsDatabase() {
  // Extract database ID from URL
  const databaseId = '248ee3c6-d996-807a-bd99-d2b2202b7ba2';
  
  try {
    // Get database schema
    const db = await notion.databases.retrieve({
      database_id: databaseId,
    });
    
    console.log('Clients Database Schema:');
    console.log('=======================');
    console.log(`Title: ${db.title[0]?.plain_text || 'Untitled'}`);
    console.log(`\nProperties:`);
    
    Object.entries(db.properties).forEach(([key, prop]) => {
      console.log(`  - ${key} (${prop.type})`);
    });
    
    // Get sample data
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 5,
    });
    
    console.log(`\nFound ${response.results.length} clients. Sample data:`);
    console.log('=====================================');
    
    response.results.forEach((page, index) => {
      if ('properties' in page) {
        console.log(`\nClient ${index + 1}:`);
        const props = page.properties;
        
        // Find title property
        const titleProp = Object.entries(props).find(([_, p]) => p.type === 'title');
        if (titleProp) {
          const title = titleProp[1].title?.[0]?.plain_text || 'No name';
          console.log(`  Name: ${title}`);
        }
        
        // Show other key properties
        if (props['Type']) {
          const type = props['Type'].select?.name || 'N/A';
          console.log(`  Type: ${type}`);
        }
        
        if (props['Phone']) {
          const phone = props['Phone'].phone_number || 'N/A';
          console.log(`  Phone: ${phone}`);
        }
        
        if (props['Email']) {
          const email = props['Email'].email || 'N/A';
          console.log(`  Email: ${email}`);
        }
        
        if (props['Address']) {
          const address = props['Address'].rich_text?.[0]?.plain_text || 'N/A';
          console.log(`  Address: ${address}`);
        }
        
        console.log(`  Notion ID: ${page.id}`);
      }
    });
    
  } catch (error) {
    console.error('Error checking Clients database:', error.message);
  }
}

checkClientsDatabase();