/**
 * Common types for the agent system
 */

export interface Task {
  id: string;
  type: string;
  data: any;
  metadata?: {
    createdAt: Date;
    createdBy?: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    deadline?: Date;
    retryCount?: number;
    maxRetries?: number;
  };
}

export interface AgentConfig {
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  schedule?: string;
  enabled: boolean;
  maxConcurrency?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executionTime: number;
    tokensUsed?: number;
    cost?: number;
  };
}

export interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification' | 'error';
  payload: any;
  timestamp: Date;
  correlationId?: string;
}

export interface AgentState {
  agentName: string;
  status: 'idle' | 'running' | 'failed' | 'disabled';
  currentTask?: Task;
  lastExecution?: Date;
  nextExecution?: Date;
  metrics: AgentMetrics;
}

export interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastError?: string;
  lastErrorTime?: Date;
}