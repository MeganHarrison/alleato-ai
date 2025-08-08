import { Client } from '@notionhq/client';

// Initialize Notion client
export function getNotionClient(apiKey: string) {
  return new Client({
    auth: apiKey,
  });
}

// Type definitions for our project data
export interface ProjectData {
  id: number;
  header: string;
  type: string;
  status: string;
  target: string;
  limit: string;
  reviewer: string;
}

// Map our project data to Notion properties
export function mapProjectToNotionProperties(project: ProjectData) {
  // Map to existing Notion database properties
  return {
    'Project name': {
      title: [
        {
          text: {
            content: project.header,
          },
        },
      ],
    },
    // Temporarily comment out Phase and Priority until we know the valid options
    // 'Phase': {
    //   status: {
    //     name: project.status,
    //   },
    // },
    // 'Priority': {
    //   select: {
    //     name: 'Medium',
    //   },
    // },
    'Job #': {
      rich_text: [
        {
          text: {
            content: `DOC-${project.id}`,
          },
        },
      ],
    },
    'Address': {
      rich_text: [
        {
          text: {
            content: `Type: ${project.type} | Reviewer: ${project.reviewer}`,
          },
        },
      ],
    },
    'Est Revenue': {
      number: parseInt(project.target) || 0,
    },
    'Est Profit': {
      number: parseInt(project.limit) || 0,
    },
  };
}

// Sync projects to Notion
export async function syncProjectsToNotion(
  apiKey: string,
  databaseId: string,
  projects: ProjectData[]
) {
  const notion = getNotionClient(apiKey);
  const results = [];

  try {
    // Get existing pages to check for duplicates
    const existingPages = await notion.databases.query({
      database_id: databaseId,
    });

    // Create a map of existing pages by Job #
    const existingMap = new Map();
    for (const page of existingPages.results) {
      if ('properties' in page) {
        const jobNumber = page.properties['Job #'];
        if (jobNumber && 'rich_text' in jobNumber && jobNumber.rich_text.length > 0) {
          const jobId = jobNumber.rich_text[0].plain_text;
          existingMap.set(jobId, page.id);
        }
      }
    }

    // Sync each project
    for (const project of projects) {
      try {
        const properties = mapProjectToNotionProperties(project);
        
        const jobId = `DOC-${project.id}`;
        if (existingMap.has(jobId)) {
          // Update existing page
          const pageId = existingMap.get(jobId);
          const response = await notion.pages.update({
            page_id: pageId,
            properties,
          });
          results.push({ project: project.header, status: 'updated', pageId: response.id });
        } else {
          // Create new page
          const response = await notion.pages.create({
            parent: { database_id: databaseId },
            properties,
          });
          results.push({ project: project.header, status: 'created', pageId: response.id });
        }
      } catch (error) {
        console.error(`Error syncing project "${project.header}":`, error);
        results.push({ 
          project: project.header, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error syncing to Notion:', error);
    throw error;
  }
}