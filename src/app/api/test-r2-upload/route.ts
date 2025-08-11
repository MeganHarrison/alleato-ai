import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    // Create a test file to verify R2 upload works
    const testContent = `# Test Meeting
    
Date: ${new Date().toISOString()}
Test: This is a test file to verify R2 uploads are working.

## Meeting Notes
- Testing R2 bucket connectivity
- Verifying file upload process
- Checking naming conventions
`;
    
    const filename = `${new Date().toISOString().split('T')[0]} - Test Meeting.md`;
    
    console.log('Uploading test file:', filename);
    
    // Upload to R2 (no meetings folder)
    const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${env.R2_BUCKET_NAME}/objects/${filename}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'text/markdown',
      },
      body: testContent
    });
    
    console.log('Upload response status:', uploadResponse.status);
    const responseText = await uploadResponse.text();
    console.log('Upload response:', responseText);
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} - ${responseText}`);
    }
    
    // Try to read it back
    const readUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${env.R2_BUCKET_NAME}/objects/${filename}`;
    
    const readResponse = await fetch(readUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    });
    
    return NextResponse.json({
      success: true,
      uploadedFile: filename,
      uploadPath: filename,
      uploadStatus: uploadResponse.status,
      readStatus: readResponse.status,
      message: 'Test file uploaded successfully'
    });
    
  } catch (error) {
    console.error('Test upload error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to upload test file',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}