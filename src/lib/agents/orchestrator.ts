/**
 * Agent Orchestrator
 * 
 * Central controller that manages and coordinates all sub-agents
 * Handles agent lifecycle, scheduling, and inter-agent communication
 */

import { MeetingIntelligenceAgent } from './meeting-intelligence-agent';

export interface Agent {
  name: string;
  description: string;
  schedule?: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'failed' | 'disabled';
  execute: (task: any) => Promise<any>;
}

export interface AgentTask {
  id: string;
  agentName: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  data: any;
  createdAt: Date;
  scheduledFor?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private taskQueue: AgentTask[] = [];
  private running: boolean = false;
  private executionHistory: AgentTask[] = [];

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize all available agents
   */
  private initializeAgents() {
    // Register all agents here
    this.registerAgent({
      name: 'data-sync-agent',
      description: 'Synchronizes data from external sources',
      schedule: '0 */1 * * *', // Every hour
      enabled: true,
      status: 'idle',
      execute: this.dataSyncAgent.bind(this)
    });

    this.registerAgent({
      name: 'meeting-intelligence-agent',
      description: 'Analyzes meeting transcripts for insights',
      schedule: '0 */2 * * *', // Every 2 hours
      enabled: true,
      status: 'idle',
      execute: async (task) => {
        const agent = new MeetingIntelligenceAgent();
        return await agent.execute(task);
      }
    });

    this.registerAgent({
      name: 'project-monitor-agent',
      description: 'Monitors project health and progress',
      schedule: '0 9,15 * * *', // 9 AM and 3 PM daily
      enabled: true,
      status: 'idle',
      execute: this.projectMonitorAgent.bind(this)
    });

    this.registerAgent({
      name: 'notification-agent',
      description: 'Sends intelligent notifications',
      enabled: true,
      status: 'idle',
      execute: this.notificationAgent.bind(this)
    });

    this.registerAgent({
      name: 'report-generator-agent',
      description: 'Generates automated reports',
      schedule: '0 8 * * 1', // Every Monday at 8 AM
      enabled: true,
      status: 'idle',
      execute: this.reportGeneratorAgent.bind(this)
    });
  }

  /**
   * Register a new agent
   */
  registerAgent(agent: Agent) {
    this.agents.set(agent.name, agent);
    console.log(`[Orchestrator] Registered agent: ${agent.name}`);
  }

  /**
   * Queue a task for an agent
   */
  async queueTask(
    agentName: string, 
    data: any, 
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium',
    scheduledFor?: Date
  ): Promise<string> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    const task: AgentTask = {
      id: crypto.randomUUID(),
      agentName,
      priority,
      data,
      createdAt: new Date(),
      scheduledFor,
      status: 'pending'
    };

    this.taskQueue.push(task);
    this.sortTaskQueue();

    console.log(`[Orchestrator] Queued task ${task.id} for ${agentName}`);

    // If critical, execute immediately
    if (priority === 'critical') {
      await this.executeTask(task);
    }

    return task.id;
  }

  /**
   * Sort task queue by priority and scheduled time
   */
  private sortTaskQueue() {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    this.taskQueue.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by scheduled time
      const aTime = a.scheduledFor?.getTime() || a.createdAt.getTime();
      const bTime = b.scheduledFor?.getTime() || b.createdAt.getTime();
      return aTime - bTime;
    });
  }

  /**
   * Execute a specific task
   */
  private async executeTask(task: AgentTask): Promise<void> {
    const agent = this.agents.get(task.agentName);
    if (!agent || !agent.enabled) {
      task.status = 'failed';
      task.error = 'Agent not available or disabled';
      return;
    }

    try {
      console.log(`[Orchestrator] Executing task ${task.id} with agent ${task.agentName}`);
      
      task.status = 'running';
      agent.status = 'running';
      agent.lastRun = new Date();
      
      const result = await agent.execute(task);
      
      task.status = 'completed';
      task.result = result;
      agent.status = 'idle';
      
      console.log(`[Orchestrator] Task ${task.id} completed successfully`);
      
      // Move to history
      this.executionHistory.push(task);
      this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
      
      // Handle task results
      await this.handleTaskResult(task, result);
      
    } catch (error) {
      console.error(`[Orchestrator] Task ${task.id} failed:`, error);
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      agent.status = 'failed';
    }
  }

  /**
   * Handle task results and trigger dependent tasks
   */
  private async handleTaskResult(task: AgentTask, result: any) {
    // Handle agent-specific results
    switch (task.agentName) {
      case 'data-sync-agent':
        if (result.newMeetings > 0) {
          // Trigger meeting intelligence for new meetings
          await this.queueTask('meeting-intelligence-agent', {
            meetingIds: result.meetingIds
          }, 'high');
        }
        break;
        
      case 'meeting-intelligence-agent':
        if (result.risks?.some((r: any) => r.severity === 'critical')) {
          // Trigger immediate notification
          await this.queueTask('notification-agent', {
            type: 'critical-risk',
            data: result.risks
          }, 'critical');
        }
        break;
        
      case 'project-monitor-agent':
        if (result.healthScore < 50) {
          // Generate emergency report
          await this.queueTask('report-generator-agent', {
            type: 'emergency',
            projectId: result.projectId
          }, 'high');
        }
        break;
    }
  }

  /**
   * Start the orchestrator
   */
  async start() {
    if (this.running) {
      console.log('[Orchestrator] Already running');
      return;
    }

    this.running = true;
    console.log('[Orchestrator] Started');

    // Start processing queue
    this.processQueue();
    
    // Start scheduled tasks
    this.startScheduler();
  }

  /**
   * Process task queue continuously
   */
  private async processQueue() {
    while (this.running) {
      const now = new Date();
      
      // Get next pending task that's ready to run
      const nextTask = this.taskQueue.find(t => 
        t.status === 'pending' && 
        (!t.scheduledFor || t.scheduledFor <= now)
      );

      if (nextTask) {
        await this.executeTask(nextTask);
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
    }
  }

  /**
   * Start scheduler for periodic tasks
   */
  private startScheduler() {
    // This would use cron or similar scheduling
    // For now, simplified example
    setInterval(() => {
      const now = new Date();
      
      this.agents.forEach(agent => {
        if (agent.schedule && agent.enabled) {
          // Check if it's time to run based on schedule
          // This is simplified - would use proper cron parsing
          if (this.shouldRunNow(agent.schedule, agent.lastRun)) {
            this.queueTask(agent.name, { scheduled: true }, 'medium');
          }
        }
      });
    }, 60000); // Check every minute
  }

  /**
   * Check if agent should run based on schedule
   */
  private shouldRunNow(schedule: string, lastRun?: Date): boolean {
    // Simplified - would use proper cron parsing library
    const now = new Date();
    if (!lastRun) return true;
    
    const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
    
    // Parse schedule (simplified)
    if (schedule.includes('*/1 * * *')) return hoursSinceLastRun >= 1;
    if (schedule.includes('*/2 * * *')) return hoursSinceLastRun >= 2;
    if (schedule.includes('0 8 * * 1')) return now.getDay() === 1 && now.getHours() === 8;
    
    return false;
  }

  /**
   * Stop the orchestrator
   */
  stop() {
    this.running = false;
    console.log('[Orchestrator] Stopped');
  }

  /**
   * Get status of all agents
   */
  getStatus() {
    const agents = Array.from(this.agents.values()).map(agent => ({
      name: agent.name,
      description: agent.description,
      status: agent.status,
      enabled: agent.enabled,
      lastRun: agent.lastRun,
      nextRun: agent.nextRun
    }));

    return {
      running: this.running,
      agents,
      queueLength: this.taskQueue.length,
      pendingTasks: this.taskQueue.filter(t => t.status === 'pending').length,
      runningTasks: this.taskQueue.filter(t => t.status === 'running').length,
      completedTasks: this.executionHistory.filter(t => t.status === 'completed').length,
      failedTasks: this.executionHistory.filter(t => t.status === 'failed').length
    };
  }

  /**
   * Get task history
   */
  getHistory(limit: number = 100) {
    return this.executionHistory.slice(-limit);
  }

  // Agent Implementations (simplified examples)

  private async dataSyncAgent(task: any) {
    console.log('[DataSyncAgent] Starting sync...');
    
    // Check for new meetings from Fireflies
    // Sync to R2
    // Update D1
    
    return {
      newMeetings: 3,
      meetingIds: ['meeting-1', 'meeting-2', 'meeting-3'],
      syncedAt: new Date()
    };
  }

  private async projectMonitorAgent(task: any) {
    console.log('[ProjectMonitorAgent] Monitoring projects...');
    
    // Analyze project health
    // Check for risks
    // Calculate metrics
    
    return {
      projectId: 'project-1',
      healthScore: 75,
      risks: [],
      metrics: {
        velocity: 8,
        burnRate: 1.2,
        timeline: 'on-track'
      }
    };
  }

  private async notificationAgent(task: any) {
    console.log('[NotificationAgent] Sending notification...', task.data);
    
    // Send to appropriate channels
    // Log notification
    
    return {
      sent: true,
      channels: ['email', 'slack'],
      timestamp: new Date()
    };
  }

  private async reportGeneratorAgent(task: any) {
    console.log('[ReportGeneratorAgent] Generating report...');
    
    // Gather data
    // Generate report
    // Store/send report
    
    return {
      reportId: 'report-' + Date.now(),
      type: task.data?.type || 'weekly',
      generated: true
    };
  }
}

// Singleton instance
export const orchestrator = new AgentOrchestrator();