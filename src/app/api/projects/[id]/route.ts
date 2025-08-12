import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
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

    // Try KV cache first
    const cacheKey = `project:${projectId}`;
    if (kv) {
      try {
        const cached = await kv.get(cacheKey, 'json');
        if (cached) {
          console.log(`Serving project ${projectId} from KV cache`);
          return NextResponse.json({
            success: true,
            project: cached,
            cached: true
          });
        }
      } catch (error) {
        console.error('KV cache read error:', error);
      }
    }

    // Fetch comprehensive project data from D1
    const projectQuery = await db.prepare(`
      SELECT 
        p.*,
        c.company_name as client_name,
        c.contact_person as client_contact,
        c.email as client_email,
        c.phone as client_phone,
        pm.first_name || ' ' || pm.last_name as project_manager_name,
        pm.email as project_manager_email,
        su.first_name || ' ' || su.last_name as superintendent_name,
        su.email as superintendent_email,
        es.first_name || ' ' || es.last_name as estimator_name,
        es.email as estimator_email
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN employees pm ON p.project_manager_id = pm.id
      LEFT JOIN employees su ON p.superintendent_id = su.id
      LEFT JOIN employees es ON p.estimator_id = es.id
      WHERE p.id = ?
    `).bind(projectId).first();

    if (!projectQuery) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    // Get meeting count
    const meetingCountQuery = await db.prepare(`
      SELECT COUNT(*) as count FROM meetings WHERE project_id = ?
    `).bind(projectId).first();

    // Get document count from R2 (simplified for now)
    const documentCount = projectQuery.document_count || 0;

    // Get recent risks from meetings
    const recentRisksQuery = await db.prepare(`
      SELECT 
        risk_items,
        meeting_date
      FROM meetings 
      WHERE project_id = ? 
        AND risk_items IS NOT NULL 
      ORDER BY meeting_date DESC 
      LIMIT 5
    `).bind(projectId).all();

    // Calculate health score
    let healthScore = 100;
    
    // Check schedule adherence
    if (projectQuery.estimated_completion) {
      const daysUntilDeadline = Math.floor(
        (new Date(projectQuery.estimated_completion).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDeadline < 30) healthScore -= 15;
      if (daysUntilDeadline < 0) healthScore -= 30;
    }
    
    // Check profit margin
    const profitMargin = projectQuery.profit_margin || 0;
    if (profitMargin < 0.1) healthScore -= 20;
    if (profitMargin < 0.05) healthScore -= 30;
    
    // Check if actual cost is exceeding budget
    if (projectQuery.actual_cost && projectQuery.budget) {
      const costOverrun = (projectQuery.actual_cost - projectQuery.budget) / projectQuery.budget;
      if (costOverrun > 0.1) healthScore -= 25;
      if (costOverrun > 0.2) healthScore -= 35;
    }

    // Generate AI summary (in production, call AI service)
    const aiSummary = generateProjectSummary(projectQuery, healthScore);
    
    // Parse risk items if they exist
    let riskAnalysis = [];
    if (recentRisksQuery.results && recentRisksQuery.results.length > 0) {
      try {
        const risks = recentRisksQuery.results[0].risk_items;
        if (typeof risks === 'string') {
          riskAnalysis = JSON.parse(risks);
        }
      } catch (e) {
        console.error('Error parsing risk items:', e);
      }
    }

    // Build comprehensive project object
    const project = {
      id: projectQuery.id,
      title: projectQuery.title || projectQuery.name,
      description: projectQuery.description,
      client_name: projectQuery.client_name,
      client_id: projectQuery.client_id,
      status: projectQuery.status || 'active',
      priority: projectQuery.priority || 'medium',
      estimated_value: projectQuery.estimated_value || projectQuery.budget || 0,
      actual_cost: projectQuery.actual_cost,
      profit_margin: profitMargin,
      start_date: projectQuery.start_date,
      estimated_completion: projectQuery.estimated_completion || projectQuery.end_date,
      actual_completion: projectQuery.actual_completion,
      project_address: projectQuery.project_address,
      
      // Team members
      project_manager: projectQuery.project_manager_name ? {
        id: projectQuery.project_manager_id,
        name: projectQuery.project_manager_name,
        email: projectQuery.project_manager_email
      } : null,
      
      superintendent: projectQuery.superintendent_name ? {
        id: projectQuery.superintendent_id,
        name: projectQuery.superintendent_name,
        email: projectQuery.superintendent_email
      } : null,
      
      estimator: projectQuery.estimator_name ? {
        id: projectQuery.estimator_id,
        name: projectQuery.estimator_name,
        email: projectQuery.estimator_email
      } : null,
      
      // AI Insights
      health_score: Math.max(0, Math.min(100, healthScore)),
      ai_summary: aiSummary,
      risk_analysis: riskAnalysis,
      
      // Counts
      meeting_count: meetingCountQuery?.count || 0,
      document_count: documentCount,
      note_count: 0, // TODO: Implement notes
      change_order_count: 0 // TODO: Implement change orders
    };

    // Cache in KV with 5-minute TTL
    if (kv) {
      try {
        await kv.put(cacheKey, JSON.stringify(project), {
          expirationTtl: 300 // 5 minutes
        });
        console.log(`Cached project ${projectId} in KV`);
      } catch (error) {
        console.error('KV cache write error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      project,
      cached: false
    });

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function generateProjectSummary(project: any, healthScore: number): string {
  const status = project.status || 'active';
  const profitMargin = (project.profit_margin || 0) * 100;
  
  let summary = `Project is ${status} with a health score of ${healthScore}%. `;
  
  if (healthScore >= 80) {
    summary += `The project is performing well with strong metrics across all areas. `;
  } else if (healthScore >= 60) {
    summary += `The project shows moderate health with some areas requiring attention. `;
  } else {
    summary += `The project requires immediate attention to address critical issues. `;
  }
  
  if (profitMargin > 15) {
    summary += `Profit margin of ${profitMargin.toFixed(1)}% exceeds targets. `;
  } else if (profitMargin > 10) {
    summary += `Profit margin of ${profitMargin.toFixed(1)}% is on target. `;
  } else {
    summary += `Profit margin of ${profitMargin.toFixed(1)}% is below target and needs review. `;
  }
  
  if (project.estimated_completion) {
    const daysUntilDeadline = Math.floor(
      (new Date(project.estimated_completion).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilDeadline > 60) {
      summary += `Project has ${daysUntilDeadline} days until deadline with good schedule buffer. `;
    } else if (daysUntilDeadline > 30) {
      summary += `Project has ${daysUntilDeadline} days until deadline. Monitor closely. `;
    } else if (daysUntilDeadline > 0) {
      summary += `Only ${daysUntilDeadline} days remain until deadline. Consider acceleration. `;
    } else {
      summary += `Project is ${Math.abs(daysUntilDeadline)} days overdue. Immediate action required. `;
    }
  }
  
  return summary;
}