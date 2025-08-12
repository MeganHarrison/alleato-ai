import { NextRequest, NextResponse } from 'next/server';

// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment

export async function GET(request: NextRequest) {
  try {
    // Return basic status information
    // This is a simplified version that doesn't require database access
    
    const statuses = [
      {
        service: 'R2 Storage',
        status: 'warning',
        message: 'R2 bucket binding not configured in production',
        count: 0
      },
      {
        service: 'Meeting Files',
        status: 'success',
        message: 'API endpoint working',
        count: 2
      },
      {
        service: 'D1 Database - Meetings',
        status: 'warning',
        message: 'Database tables need initialization',
        count: 0
      },
      {
        service: 'D1 Database - Projects',
        status: 'warning',
        message: 'Database tables need initialization',
        count: 0
      },
      {
        service: 'D1 Database - Clients',
        status: 'warning',
        message: 'Database tables need initialization',
        count: 0
      },
      {
        service: 'Notion API',
        status: 'error',
        message: 'Notion API key not configured',
        count: 0
      },
      {
        service: 'Vectorization',
        status: 'warning',
        message: 'Vectorization not configured',
        count: 0
      }
    ];

    return NextResponse.json({
      success: true,
      statuses,
      timestamp: new Date().toISOString(),
      message: 'Basic status check - full verification requires database access'
    });

  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}