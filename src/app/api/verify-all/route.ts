import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    // 1. Check R2 Storage Connection
    try {
      const r2 = env.R2_BUCKET;
      const listResult = await r2.list({ limit: 1 });
      results.checks.r2Storage = {
        status: 'success',
        message: 'R2 storage is accessible',
        details: {
          connected: true,
          sampleObject: listResult.objects[0]?.key || 'No objects found'
        }
      };
      results.summary.passed++;
    } catch (error) {
      results.checks.r2Storage = {
        status: 'error',
        message: 'Failed to connect to R2 storage',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.summary.failed++;
    }

    // 2. Check R2 Meeting Files
    try {
      const r2 = env.R2_BUCKET;
      const meetingsList = await r2.list({ prefix: 'fireflies-transcripts/', limit: 1000 });
      const meetingCount = meetingsList.objects.length;
      
      results.checks.r2Meetings = {
        status: meetingCount > 0 ? 'success' : 'warning',
        message: `Found ${meetingCount} meeting transcripts in R2`,
        details: {
          count: meetingCount,
          latestMeeting: meetingsList.objects[meetingsList.objects.length - 1]?.key,
          oldestMeeting: meetingsList.objects[0]?.key
        }
      };
      
      if (meetingCount > 0) {
        results.summary.passed++;
      } else {
        results.summary.warnings++;
      }
    } catch (error) {
      results.checks.r2Meetings = {
        status: 'error',
        message: 'Failed to list meetings in R2',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.summary.failed++;
    }

    // 3. Check D1 Database Connection
    try {
      const db = env.DB;
      const tableCheck = await db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();
      
      results.checks.d1Connection = {
        status: 'success',
        message: 'D1 database is accessible',
        details: {
          tables: tableCheck.results.map((t: any) => t.name),
          tableCount: tableCheck.results.length
        }
      };
      results.summary.passed++;
    } catch (error) {
      results.checks.d1Connection = {
        status: 'error',
        message: 'Failed to connect to D1 database',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.summary.failed++;
    }

    // 4. Check D1 Meetings Table
    try {
      const db = env.DB;
      const meetingsCount = await db.prepare(
        "SELECT COUNT(*) as count FROM meetings"
      ).first();
      
      const latestMeeting = await db.prepare(
        "SELECT * FROM meetings ORDER BY date DESC LIMIT 1"
      ).first();
      
      results.checks.d1Meetings = {
        status: meetingsCount?.count > 0 ? 'success' : 'warning',
        message: `${meetingsCount?.count || 0} meetings in D1 database`,
        details: {
          count: meetingsCount?.count || 0,
          latestMeeting: latestMeeting || null
        }
      };
      
      if (meetingsCount?.count > 0) {
        results.summary.passed++;
      } else {
        results.summary.warnings++;
      }
    } catch (error) {
      results.checks.d1Meetings = {
        status: 'error',
        message: 'Meetings table not found or inaccessible',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.summary.failed++;
    }

    // 5. Check D1 Projects Table
    try {
      const db = env.DB;
      const projectsCount = await db.prepare(
        "SELECT COUNT(*) as count FROM projects"
      ).first();
      
      results.checks.d1Projects = {
        status: projectsCount?.count > 0 ? 'success' : 'warning',
        message: `${projectsCount?.count || 0} projects in D1 database`,
        details: {
          count: projectsCount?.count || 0
        }
      };
      
      if (projectsCount?.count > 0) {
        results.summary.passed++;
      } else {
        results.summary.warnings++;
      }
    } catch (error) {
      results.checks.d1Projects = {
        status: 'error',
        message: 'Projects table not found or inaccessible',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.summary.failed++;
    }

    // 6. Check D1 Clients Table
    try {
      const db = env.DB;
      const clientsCount = await db.prepare(
        "SELECT COUNT(*) as count FROM clients"
      ).first();
      
      results.checks.d1Clients = {
        status: clientsCount?.count > 0 ? 'success' : 'warning',
        message: `${clientsCount?.count || 0} clients in D1 database`,
        details: {
          count: clientsCount?.count || 0
        }
      };
      
      if (clientsCount?.count > 0) {
        results.summary.passed++;
      } else {
        results.summary.warnings++;
      }
    } catch (error) {
      results.checks.d1Clients = {
        status: 'error',
        message: 'Clients table not found or inaccessible',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.summary.failed++;
    }

    // 7. Check Fireflies API Key
    results.checks.firefliesAPI = {
      status: env.FIREFLIES_API_KEY && env.FIREFLIES_API_KEY !== 'YOUR_FIREFLIES_API_KEY' ? 'success' : 'error',
      message: env.FIREFLIES_API_KEY && env.FIREFLIES_API_KEY !== 'YOUR_FIREFLIES_API_KEY' 
        ? 'Fireflies API key is configured' 
        : 'Fireflies API key is not configured',
      details: {
        configured: !!(env.FIREFLIES_API_KEY && env.FIREFLIES_API_KEY !== 'YOUR_FIREFLIES_API_KEY')
      }
    };
    
    if (env.FIREFLIES_API_KEY && env.FIREFLIES_API_KEY !== 'YOUR_FIREFLIES_API_KEY') {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }

    // 8. Check Notion API Key
    results.checks.notionAPI = {
      status: env.NOTION_API_KEY && env.NOTION_API_KEY !== 'YOUR_NOTION_API_KEY' ? 'success' : 'error',
      message: env.NOTION_API_KEY && env.NOTION_API_KEY !== 'YOUR_NOTION_API_KEY'
        ? 'Notion API key is configured'
        : 'Notion API key is not configured',
      details: {
        configured: !!(env.NOTION_API_KEY && env.NOTION_API_KEY !== 'YOUR_NOTION_API_KEY'),
        databaseId: env.NOTION_DATABASE_ID,
        clientsDatabaseId: env.NOTION_CLIENTS_DATABASE_ID
      }
    };
    
    if (env.NOTION_API_KEY && env.NOTION_API_KEY !== 'YOUR_NOTION_API_KEY') {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }

    // 9. Check Cloudflare AI Configuration
    results.checks.cloudflareAI = {
      status: env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN ? 'success' : 'error',
      message: env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN
        ? 'Cloudflare AI is configured'
        : 'Cloudflare AI credentials are not configured',
      details: {
        accountConfigured: !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_ACCOUNT_ID !== 'your-account-id-here'),
        tokenConfigured: !!(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_API_TOKEN !== 'your-api-token-here')
      }
    };
    
    if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN && 
        env.CLOUDFLARE_ACCOUNT_ID !== 'your-account-id-here' && 
        env.CLOUDFLARE_API_TOKEN !== 'your-api-token-here') {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }

    // Calculate totals
    results.summary.total = results.summary.passed + results.summary.failed + results.summary.warnings;
    results.summary.health = results.summary.failed === 0 ? 
      (results.summary.warnings === 0 ? 'healthy' : 'warning') : 'critical';

    // Add recommendations
    results.recommendations = [];
    
    if (results.checks.r2Meetings?.details?.count === 0) {
      results.recommendations.push('Run "Sync Fireflies" to import meeting transcripts from Fireflies');
    }
    
    if (results.checks.d1Meetings?.details?.count === 0 && results.checks.r2Meetings?.details?.count > 0) {
      results.recommendations.push('Run "Sync Meetings to D1" to import meetings from R2 to database');
    }
    
    if (results.checks.d1Projects?.details?.count === 0) {
      results.recommendations.push('Run "Sync Notion to D1" to import projects from Notion');
    }
    
    if (results.checks.d1Clients?.details?.count === 0) {
      results.recommendations.push('Run "Sync Notion Clients to D1" to import clients from Notion');
    }
    
    if (!results.checks.firefliesAPI?.details?.configured) {
      results.recommendations.push('Configure FIREFLIES_API_KEY in environment variables');
    }
    
    if (!results.checks.notionAPI?.details?.configured) {
      results.recommendations.push('Configure NOTION_API_KEY in environment variables');
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run verification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';