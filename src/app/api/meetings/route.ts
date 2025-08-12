import { NextRequest, NextResponse } from 'next/server';

const API_WORKER_URL = process.env.NEXT_PUBLIC_API_WORKER_URL || 'https://alleato-api.megan-d14.workers.dev';

export async function GET(request: NextRequest) {
  try {
    // Forward the request to the deployed API worker
    const response = await fetch(`${API_WORKER_URL}/api/meetings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('API worker error:', errorData);
      return NextResponse.json(
        { error: errorData.error || response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Meetings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}