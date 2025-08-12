import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    console.log('R2 Bucket:', env.R2_BUCKET_NAME);
    console.log('Account ID:', env.CLOUDFLARE_ACCOUNT_ID);
    
    // First, check if bucket exists
    const bucketCheckUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${env.R2_BUCKET_NAME}`;
    console.log('Checking bucket at:', bucketCheckUrl);
    
    const bucketCheck = await fetch(bucketCheckUrl, {
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    });
    
    if (!bucketCheck.ok) {
      const errorText = await bucketCheck.text();
      console.error('Bucket check failed:', errorText);
      throw new Error(`Bucket check failed: ${bucketCheck.status} - ${errorText}`);
    }
    
    // List objects in R2 bucket - using S3-compatible API
    const listUrl = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}`;
    console.log('Attempting list with S3 API at:', listUrl);
    
    // Try the REST API approach with pagination
    const allObjects = [];
    let cursor = undefined;
    let hasMore = true;
    
    while (hasMore && allObjects.length < 1000) { // Limit to 1000 objects for safety
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      params.set('per_page', '1000'); // Max allowed per page
      
      const listResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${env.R2_BUCKET_NAME}/objects?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('List response status:', listResponse.status);
      
      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error('List failed:', errorText);
        throw new Error(`Failed to list R2 objects: ${listResponse.status} - ${errorText}`);
      }

      const data = await listResponse.json();
      
      // Add objects to our collection
      if (Array.isArray(data.result)) {
        allObjects.push(...data.result);
      } else if (data.result?.objects) {
        allObjects.push(...data.result.objects);
      }
      
      // Check if there are more pages
      cursor = data.result_info?.cursor;
      hasMore = data.result_info?.is_truncated === true;
    }
    
    console.log(`Retrieved ${allObjects.length} total objects`);
    
    // Filter for meeting files (markdown files with date format)
    const meetingFiles = allObjects.filter((obj: any) => {
      const key = obj.key || obj.Key || obj.name;
      if (!key || !key.endsWith('.md')) return false;
      
      // Check if filename matches our date format: YYYY-MM-DD - Title.md
      const filename = key.split('/').pop() || '';
      const hasDateFormat = /^\d{4}-\d{2}-\d{2}\s*-\s*.+\.md$/.test(filename);
      
      return hasDateFormat;
    });
    
    console.log(`Total objects found: ${allObjects.length}`);
    console.log(`Meeting files found: ${meetingFiles.length}`);
    
    console.log(`Found ${meetingFiles.length} meeting files`);
    
    // Sort by filename (which includes date)
    meetingFiles.sort((a: any, b: any) => {
      const aKey = a.key || a.Key || a.name;
      const bKey = b.key || b.Key || b.name;
      return bKey.localeCompare(aKey);
    });
    
    // Extract dates from filenames
    const fileDetails = meetingFiles.map((file: any) => {
      const key = file.key || file.Key || file.name;
      const filename = key.split('/').pop() || '';
      const match = filename.match(/^(\d{4}-\d{2}-\d{2})\s*-\s*(.+)\.md$/);
      
      return {
        filename: filename,
        path: key,
        size: file.size || file.Size || 0,
        uploaded: file.uploaded || file.LastModified || file.last_modified,
        date: match ? match[1] : 'Unknown',
        title: match ? match[2] : filename.replace('.md', ''),
      };
    });
    
    // Find most recent file
    const mostRecent = fileDetails.length > 0 ? fileDetails[0] : null;
    
    // Also show some non-meeting files for debugging
    const otherFiles = allObjects
      .filter((obj: any) => {
        const key = obj.key || obj.Key || obj.name;
        return key && key.endsWith('.md') && !meetingFiles.includes(obj);
      })
      .slice(0, 5)
      .map((obj: any) => obj.key || obj.Key || obj.name);
    
    return NextResponse.json({
      totalFiles: meetingFiles.length,
      totalObjects: allObjects.length,
      mostRecentFile: mostRecent,
      files: fileDetails,
      bucketName: env.R2_BUCKET_NAME,
      sampleMarkdownFiles: otherFiles,
      debug: {
        paginationInfo: `Retrieved ${allObjects.length} objects`,
        sampleKeys: allObjects.slice(0, 10).map(o => o.key || o.Key || o.name),
        cursor: cursor,
      }
    });
    
  } catch (error) {
    console.error('R2 test error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list R2 contents',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    
    // Test Fireflies API connection
    const firefliesResponse = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.FIREFLIES_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query TestConnection {
            user {
              email
              name
            }
            transcripts(limit: 1) {
              id
              title
              date
            }
          }
        `
      })
    });

    if (!firefliesResponse.ok) {
      const errorText = await firefliesResponse.text();
      throw new Error(`Fireflies API error: ${firefliesResponse.status} - ${errorText}`);
    }

    const firefliesData = await firefliesResponse.json();
    
    return NextResponse.json({
      firefliesConnected: true,
      user: firefliesData.data?.user,
      latestTranscript: firefliesData.data?.transcripts?.[0],
      message: 'Fireflies API connection successful'
    });
    
  } catch (error) {
    console.error('Fireflies test error:', error);
    return NextResponse.json(
      { 
        firefliesConnected: false,
        error: 'Failed to connect to Fireflies',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
export const runtime = 'edge';
