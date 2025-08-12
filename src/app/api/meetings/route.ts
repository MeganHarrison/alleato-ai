import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Mock data for development when D1 is not available
const mockMeetings = [
  {
    id: "test-1",
    title: "Project Planning Meeting",
    date: "2025-08-12",
    duration: 60,
    participants: '["john@example.com", "jane@example.com"]',
    transcript: "This is a test transcript of the project planning meeting.",
    summary: "Discussed project timeline and resource allocation.",
    action_items: '["Create project timeline", "Assign team members"]',
    project_id: "project-alpha",
    r2_path: "2025-08-12-project-planning.md",
    created_at: "2025-08-12T10:00:00Z",
    updated_at: "2025-08-12T10:00:00Z"
  },
  {
    id: "test-2", 
    title: "Sprint Review",
    date: "2025-08-11",
    duration: 45,
    participants: '["alice@example.com", "bob@example.com", "charlie@example.com"]',
    transcript: "Sprint review discussion about completed features.",
    summary: "Reviewed completed features and planned next sprint.",
    action_items: '["Deploy to staging", "Plan next sprint"]',
    project_id: "project-beta", 
    r2_path: "2025-08-11-sprint-review.md",
    created_at: "2025-08-11T15:30:00Z",
    updated_at: "2025-08-11T15:30:00Z"
  }
];

export async function GET(request: NextRequest) {
  try {
    let meetings = mockMeetings;
    let isUsingMockData = true;

    // Try to get Cloudflare context for production/deployed environment
    try {
      const { env } = await getCloudflareContext({ async: true });
      
      if (env.DB) {
        isUsingMockData = false;
        
        // Query meetings from D1 database using correct column names
        const query = `
          SELECT 
            id,
            title,
            date,
            duration,
            participants,
            transcript,
            summary,
            action_items,
            project_id,
            r2_path,
            created_at,
            updated_at
          FROM meetings
          ORDER BY date DESC
          LIMIT 100
        `;

        const result = await env.DB.prepare(query).all();

        if (result.success && result.results) {
          meetings = result.results as any[];
        }
      }
    } catch (contextError) {
      console.log("Cloudflare context not available, using mock data for development");
    }

    // Transform the data to match what the frontend expects
    const files = meetings.map((meeting: any) => ({
      filename: `${meeting.date} - ${meeting.title}.md`,
      path: meeting.r2_path || `${meeting.date} - ${meeting.title}.md`,
      size: 0, // We don't store file size in D1, could calculate from transcript length
      uploaded: meeting.created_at,
      date: meeting.date,
      title: meeting.title,
      id: meeting.id,
      duration: meeting.duration,
      participants: meeting.participants,
      summary: meeting.summary,
      actionItems: meeting.action_items,
      projectId: meeting.project_id
    }));

    // Format the response to match what the frontend expects
    const response = {
      files: files,
      totalObjects: files.length,
      count: files.length,
      success: true,
      isUsingMockData: isUsingMockData
    };
    
    console.log('API /meetings response:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching meetings:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch meetings",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false
      },
      { status: 500 }
    );
  }
}
// export const runtime = 'edge'; // Temporarily disabled for testing
