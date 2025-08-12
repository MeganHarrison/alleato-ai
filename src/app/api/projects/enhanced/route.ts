import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment

interface ProjectWithInsights {
  id: string;
  title: string;
  client_name?: string;
  status: string;
  priority: string;
  estimated_value: number;
  profit_margin: number;
  start_date?: string;
  estimated_completion?: string;
  health_score?: number;
  risk_level?: string;
  last_meeting_date?: string;
  document_count?: number;
  meeting_count?: number;
  ai_insights?: {
    summary?: string;
    risks?: Array<{ title: string; severity: string; }>;
    opportunities?: Array<{ title: string; impact: string; }>;
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getCloudflareContext();
    const env = context?.env;
    const db = env?.DB;
    const kv = env?.PROJECT_CACHE;
    
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 500 });
    }

    // Try to get from KV cache first
    const cacheKey = 'projects:enhanced:list';
    let cachedData = null;
    
    if (kv) {
      try {
        const cached = await kv.get(cacheKey, 'json');
        if (cached) {
          console.log('Serving from KV cache');
          return NextResponse.json({
            success: true,
            projects: cached,
            cached: true,
            cacheAge: await kv.get(`${cacheKey}:timestamp`) || 'unknown'
          });
        }
      } catch (error) {
        console.error('KV cache read error:', error);
      }
    }

    // Fetch from D1 database with enhanced data
    const projectsQuery = await db.prepare(`
      SELECT 
        p.id,
        p.title,
        p.status,
        p.priority,
        p.estimated_value,
        p.actual_cost,
        p.profit_margin,
        p.start_date,
        p.estimated_completion,
        p.project_address,
        p.description,
        p.client_id,
        p.project_manager_id,
        p.superintendent_id,
        p.estimator_id,
        p.document_count,
        p.last_meeting_date,
        c.company_name as client_name,
        COUNT(DISTINCT m.id) as meeting_count
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN meetings m ON p.id = m.project_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `).all();

    const projects = projectsQuery.results || [];

    // Calculate health scores and risk levels for each project
    const enhancedProjects: ProjectWithInsights[] = await Promise.all(
      projects.map(async (project: any) => {
        // Calculate health score based on various factors
        let healthScore = 100;
        
        // Check if project is on schedule
        if (project.estimated_completion) {
          const daysUntilDeadline = Math.floor(
            (new Date(project.estimated_completion).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilDeadline < 30) healthScore -= 20;
          if (daysUntilDeadline < 0) healthScore -= 40;
        }
        
        // Check profit margin
        if (project.profit_margin < 0.1) healthScore -= 15;
        if (project.profit_margin < 0.05) healthScore -= 25;
        
        // Check meeting frequency
        const daysSinceLastMeeting = project.last_meeting_date ? 
          Math.floor((Date.now() - new Date(project.last_meeting_date).getTime()) / (1000 * 60 * 60 * 24)) : 
          999;
        if (daysSinceLastMeeting > 14) healthScore -= 10;
        if (daysSinceLastMeeting > 30) healthScore -= 20;
        
        // Determine risk level
        let riskLevel = 'low';
        if (healthScore < 80) riskLevel = 'medium';
        if (healthScore < 60) riskLevel = 'high';
        if (healthScore < 40) riskLevel = 'critical';
        
        // Generate AI insights (in production, this would call AI service)
        const aiInsights = generateMockInsights(project, healthScore, riskLevel);
        
        return {
          ...project,
          health_score: Math.max(0, Math.min(100, healthScore)),
          risk_level: riskLevel,
          ai_insights: aiInsights
        };
      })
    );

    // Cache the enhanced data in KV with 5-minute TTL
    if (kv) {
      try {
        await kv.put(cacheKey, JSON.stringify(enhancedProjects), {
          expirationTtl: 300 // 5 minutes
        });
        await kv.put(`${cacheKey}:timestamp`, new Date().toISOString(), {
          expirationTtl: 300
        });
        console.log('Cached enhanced projects data in KV');
      } catch (error) {
        console.error('KV cache write error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      projects: enhancedProjects,
      total: enhancedProjects.length,
      cached: false
    });

  } catch (error) {
    console.error('Error fetching enhanced projects:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch enhanced projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Mock function to generate AI insights
// In production, this would call OpenAI or another AI service
function generateMockInsights(project: any, healthScore: number, riskLevel: string) {
  const insights: any = {
    summary: `Project is ${healthScore}% healthy with ${riskLevel} risk level.`
  };

  // Generate risk insights
  insights.risks = [];
  if (riskLevel === 'high' || riskLevel === 'critical') {
    if (project.profit_margin < 0.1) {
      insights.risks.push({
        title: 'Low Profit Margin',
        severity: 'high',
        mitigation: 'Review costs and consider change orders'
      });
    }
    
    const daysUntilDeadline = project.estimated_completion ? 
      Math.floor((new Date(project.estimated_completion).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
      999;
    
    if (daysUntilDeadline < 30 && daysUntilDeadline > 0) {
      insights.risks.push({
        title: 'Approaching Deadline',
        severity: 'medium',
        mitigation: 'Consider adding resources to critical path items'
      });
    }
    
    if (daysUntilDeadline < 0) {
      insights.risks.push({
        title: 'Project Overdue',
        severity: 'critical',
        mitigation: 'Immediate client communication and recovery plan needed'
      });
    }
  }

  // Generate opportunity insights
  insights.opportunities = [];
  if (project.profit_margin > 0.15) {
    insights.opportunities.push({
      title: 'Strong Profit Margin',
      impact: 'high',
      action: 'Consider proposing additional scope to client'
    });
  }
  
  if (project.meeting_count > 10) {
    insights.opportunities.push({
      title: 'High Client Engagement',
      impact: 'medium',
      action: 'Leverage relationship for future projects'
    });
  }

  return insights;
}