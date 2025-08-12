import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    // Get the file path from query params
    const url = new URL(request.url);
    const filePath = url.searchParams.get('file');
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }
    
    // Fetch the file from R2
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${env.R2_BUCKET_NAME}/objects/${filePath}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    
    // Get the file content
    const content = await response.text();
    
    // Return the file with appropriate headers
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${filePath}"`,
      },
    });
    
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to download file',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment
