import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { meeting_id } = await request.json();
    
    if (!meeting_id) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_WORKER_URL || 'https://alleato-comprehensive-api.megan-d14.workers.dev';
    
    // Trigger vectorization for specific meeting
    const response = await fetch(`${apiUrl}/api/vectorize-meeting`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WORKER_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ meeting_id }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Worker API error: ${error}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing vectorization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process vectorization' },
      { status: 500 }
    );
  }
}