// Simple test script to manually sync projects
const { Client } = require('@notionhq/client');

const NOTION_API_KEY = process.env.NOTION_API_KEY || 'YOUR_NOTION_API_KEY';
const NOTION_DATABASE_ID = '18fee3c6d9968192a666fe6b55e99f52';

// Initialize Notion client
const notion = new Client({
  auth: NOTION_API_KEY,
});

// Test projects data (since we can't access D1 directly from Node.js)
const testProjects = [
  {
    id: 'proj-001',
    title: 'Test Project 1',
    project_address: '123 Main St, City, State',
    estimated_value: 100000,
    profit_margin: 0.15
  },
  {
    id: 'proj-002',
    title: 'Test Project 2',
    project_address: '456 Oak Ave, Town, State',
    estimated_value: 150000,
    profit_margin: 0.20
  }
];

async function syncProjects() {
  console.log('Starting sync...');
  
  for (const project of testProjects) {
    try {
      const properties = {
        'Project name': {
          title: [
            {
              text: {
                content: project.title,
              },
            },
          ],
        },
        'Job #': {
          rich_text: [
            {
              text: {
                content: project.id,
              },
            },
          ],
        },
        'Address': {
          rich_text: [
            {
              text: {
                content: project.project_address,
              },
            },
          ],
        },
        'Est Revenue': {
          number: project.estimated_value,
        },
        'Est Profit': {
          number: project.estimated_value * project.profit_margin,
        },
      };

      const response = await notion.pages.create({
        parent: { database_id: NOTION_DATABASE_ID },
        properties,
      });
      
      console.log(`Created project: ${project.title} (Page ID: ${response.id})`);
    } catch (error) {
      console.error(`Error syncing project ${project.title}:`, error.message);
    }
  }
  
  console.log('Sync complete!');
}

syncProjects().catch(console.error);