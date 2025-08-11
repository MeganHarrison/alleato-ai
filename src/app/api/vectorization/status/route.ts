import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_WORKER_URL || 'https://alleato-comprehensive-api.megan-d14.workers.dev';
    
    // Fetch meeting status with vectorization info
    const response = await fetch(`${apiUrl}/api/vectorization-status`, {
      headers: {
        'Authorization': `Bearer ${process.env.WORKER_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Worker API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching vectorization status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vectorization status' },
      { status: 500 }
    );
  }
}