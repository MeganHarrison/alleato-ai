import { NextResponse } from 'next/server';

export async function GET() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.ALLEATO_DATABASE_ID;

  if (!accountId || !apiToken || !databaseId) {
    return NextResponse.json(
      { error: 'Missing Cloudflare configuration' },
      { status: 500 }
    );
  }

  try {
    // Query to get meeting analytics
    const analyticsQuery = `
      SELECT 
        COUNT(*) as total_meetings,
        SUM(duration) as total_duration,
        AVG(duration) as avg_duration,
        COUNT(DISTINCT DATE(date)) as unique_days,
        COUNT(CASE WHEN date >= datetime('now', '-7 days') THEN 1 END) as weekly_meetings,
        COUNT(CASE WHEN date >= datetime('now', '-30 days') THEN 1 END) as monthly_meetings
      FROM meetings
      WHERE date IS NOT NULL
    `;

    // Query for category distribution
    const categoryQuery = `
      SELECT 
        COALESCE(category, 'uncategorized') as category,
        COUNT(*) as count
      FROM meetings
      GROUP BY category
      ORDER BY count DESC
    `;

    // Query for priority distribution
    const priorityQuery = `
      SELECT 
        priority,
        COUNT(*) as count
      FROM meetings
      WHERE priority IS NOT NULL
      GROUP BY priority
    `;

    // Query for participant statistics
    const participantQuery = `
      SELECT 
        participants,
        COUNT(*) as meeting_count
      FROM meetings
      WHERE participants IS NOT NULL
      GROUP BY participants
      ORDER BY meeting_count DESC
      LIMIT 20
    `;

    // Execute all queries
    const [analyticsResult, categoryResult, priorityResult, participantResult] = await Promise.all([
      fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: analyticsQuery,
        }),
      }).then(res => res.json()),
      
      fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: categoryQuery,
        }),
      }).then(res => res.json()),
      
      fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: priorityQuery,
        }),
      }).then(res => res.json()),
      
      fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: participantQuery,
        }),
      }).then(res => res.json()),
    ]);

    // Process results
    const analytics = analyticsResult.result?.[0]?.results?.[0] || {};
    const categories = categoryResult.result?.[0]?.results || [];
    const priorities = priorityResult.result?.[0]?.results || [];
    const participants = participantResult.result?.[0]?.results || [];

    // Process participant data to extract individual participants
    const participantStats = processParticipantData(participants);

    // Build category counts object
    const categoryCounts = {};
    categories.forEach(cat => {
      categoryCounts[cat.category] = cat.count;
    });

    // Build priority counts object
    const priorityCounts = {};
    priorities.forEach(pri => {
      priorityCounts[pri.priority] = pri.count;
    });

    return NextResponse.json({
      totalMeetings: analytics.total_meetings || 0,
      totalDuration: analytics.total_duration || 0,
      avgDuration: analytics.avg_duration || 0,
      uniqueDays: analytics.unique_days || 0,
      categoryCounts,
      priorityCounts,
      participantStats,
      recentTrends: {
        weeklyMeetings: analytics.weekly_meetings || 0,
        monthlyMeetings: analytics.monthly_meetings || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function processParticipantData(participantRecords: any[]) {
  const participantCounts: Record<string, number> = {};
  
  // Count meetings for each participant
  participantRecords.forEach(record => {
    if (record.participants) {
      const emails = record.participants.split(',').map(e => e.trim());
      emails.forEach(email => {
        participantCounts[email] = (participantCounts[email] || 0) + record.meeting_count;
      });
    }
  });

  // Sort participants by meeting count
  const sortedParticipants = Object.entries(participantCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([email]) => email);

  return {
    mostActive: sortedParticipants.slice(0, 10),
    meetingsByParticipant: participantCounts,
  };
}