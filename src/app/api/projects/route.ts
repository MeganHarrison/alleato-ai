import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment

export async function GET(request: NextRequest) {
  try {
    // Try to get Cloudflare context
    let env = null;
    let db = null;
    
    try {
      const context = await getCloudflareContext();
      env = context?.env;
      db = env?.DB;
    } catch (error) {
      console.log('Cloudflare context error:', error);
    }
    
    // Always fall back to mock data if DB is not available
    if (!db) {
      // Return mock data for development when D1 is not configured
      const mockProjects = [
        {
          id: 1,
          header: "Fire Protection System Design",
          type: "Project",
          status: "In Progress", 
          target: "150000",
          limit: "15.0%",
          reviewer: "Eddie Lake",
          notion_id: "mock-notion-1",
          priority: "high",
          project_address: "123 Main St, City, State",
          estimated_value: 150000,
          profit_margin: 0.15,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-15T00:00:00Z"
        },
        {
          id: 2,
          header: "Commercial Sprinkler Installation",
          type: "Project", 
          status: "Planning",
          target: "85000",
          limit: "12.5%",
          reviewer: "Jamik Tashpulatov",
          notion_id: "mock-notion-2",
          priority: "medium",
          project_address: "456 Business Ave, City, State",
          estimated_value: 85000,
          profit_margin: 0.125,
          created_at: "2025-01-05T00:00:00Z",
          updated_at: "2025-01-20T00:00:00Z"
        },
        {
          id: 3,
          header: "Industrial Fire Suppression",
          type: "Project",
          status: "Completed",
          target: "275000", 
          limit: "18.0%",
          reviewer: "Maya Johnson",
          notion_id: "mock-notion-3",
          priority: "high",
          project_address: "789 Industrial Blvd, City, State",
          estimated_value: 275000,
          profit_margin: 0.18,
          created_at: "2024-12-01T00:00:00Z",
          updated_at: "2025-01-30T00:00:00Z"
        }
      ];

      return NextResponse.json({
        success: true,
        projects: mockProjects,
        total: mockProjects.length,
        usingMockData: true,
        message: "Using mock data - D1 database not configured"
      });
    }

    // Try to get projects from D1 database
    let projects = [];
    try {
      const result = await db.prepare(`
        SELECT 
          id,
          name as header,
          status,
          description,
          client_id,
          start_date,
          end_date,
          budget as estimated_value,
          notion_id,
          created_at,
          updated_at
        FROM projects
        ORDER BY id
      `).all();
      
      projects = result.results || [];
    } catch (dbError) {
      console.error('Database query error:', dbError);
      // Return mock data on database error
      const mockProjects = [
        {
          id: 1,
          header: "Fire Protection System Design",
          type: "Project",
          status: "In Progress",
          target: "150000",
          limit: "15.0%",
          reviewer: "Eddie Lake"
        }
      ];
      
      return NextResponse.json({
        success: true,
        projects: mockProjects,
        total: mockProjects.length,
        usingMockData: true,
        message: "Database error - returning mock data"
      });
    }

    // Transform D1 data to match the expected table format
    const transformedProjects = projects?.map((project: any) => ({
      id: project.id,
      header: project.header || 'Untitled Project',
      type: 'Project', // Default type since D1 doesn't have this field
      status: project.status || 'Unknown',
      target: project.estimated_value?.toString() || '0',
      limit: project.profit_margin ? (project.profit_margin * 100).toFixed(1) + '%' : 'N/A',
      reviewer: 'Assign reviewer', // Default since D1 doesn't have this field
      // Keep D1-specific fields for sync operations
      notion_id: project.notion_id,
      priority: project.priority,
      project_address: project.project_address,
      estimated_value: project.estimated_value,
      profit_margin: project.profit_margin,
      created_at: project.created_at,
      updated_at: project.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      projects: transformedProjects,
      total: transformedProjects.length
    });

  } catch (error) {
    console.error('Error fetching projects from D1:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch projects from D1',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}