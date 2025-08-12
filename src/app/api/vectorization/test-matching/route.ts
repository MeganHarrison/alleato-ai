import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_WORKER_URL || 'https://alleato-comprehensive-api.megan-d14.workers.dev';
    
    // Test project/client matching for all meetings
    const response = await fetch(`${apiUrl}/api/test-project-matching`, {
      method: 'POST',
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
    console.error('Error testing project matching:', error);
    return NextResponse.json(
      { error: 'Failed to test project matching' },
      { status: 500 }
    );
  }
}
// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment
