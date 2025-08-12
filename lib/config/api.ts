/**
 * API Configuration
 * Uses deployed Cloudflare Workers
 */

// Use the deployed Cloudflare Workers
const API_BASE_URL = process.env.NEXT_PUBLIC_API_WORKER_URL || 'https://alleato-api.megan-d14.workers.dev';
const RAG_WORKER_URL = process.env.NEXT_PUBLIC_RAG_WORKER_URL || 'https://fireflies-rag-worker.megan-d14.workers.dev';

export const API_ENDPOINTS = {
  // Main API endpoints (from API worker)
  projects: `${API_BASE_URL}/api/projects`,
  clients: `${API_BASE_URL}/api/clients`,
  meetings: `${API_BASE_URL}/api/meetings`,
  documents: `${API_BASE_URL}/api/documents`,
  syncStatus: `${API_BASE_URL}/api/sync-status`,
  user: `${API_BASE_URL}/api/user`,
  test: `${API_BASE_URL}/api/test`,
  meetingsDownload: `${API_BASE_URL}/api/meetings/download`,
  
  // Sync endpoints
  syncMeetings: `${API_BASE_URL}/api/sync-meetings`,
  syncMeetingsToD1: `${API_BASE_URL}/api/sync-meetings-to-d1`,
  syncNotionToD1: `${API_BASE_URL}/api/sync-notion-to-d1`,
  syncNotionClientsToD1: `${API_BASE_URL}/api/sync-notion-clients-to-d1`,
  
  // Test endpoints
  testR2: `${API_BASE_URL}/api/test-r2`,
  checkD1Projects: `${API_BASE_URL}/api/check-d1-projects`,
  listD1Projects: `${API_BASE_URL}/api/list-d1-projects`,
  notionSchema: `${API_BASE_URL}/api/notion-schema`,
  
  // Vectorization endpoints
  vectorizationProcess: `${API_BASE_URL}/api/vectorization/process`,
  vectorizationStatus: `${API_BASE_URL}/api/vectorization/status`,
  
  // RAG Worker endpoints
  ragChat: `${RAG_WORKER_URL}/chat`,
  ragSearch: `${RAG_WORKER_URL}/search`,
  ragVectorSearch: `${RAG_WORKER_URL}/vector-search`,
  ragMeetings: `${RAG_WORKER_URL}/meetings`,
  ragSync: `${RAG_WORKER_URL}/sync`,
  ragHealth: `${RAG_WORKER_URL}/test`,
  
  // Keep local endpoint for the chat API proxy
  chat: '/api/chat',
};

export default API_ENDPOINTS;