// Workers API Client for External Cloudflare Workers

const WORKER_URLS = {
  RAG: process.env.NEXT_PUBLIC_RAG_WORKER_URL || 'https://fireflies-rag-worker.megan-d14.workers.dev',
  API: process.env.NEXT_PUBLIC_API_WORKER_URL || 'https://alleato-api.megan-d14.workers.dev',
  PROJECTS: process.env.NEXT_PUBLIC_PROJECTS_WORKER_URL || '',
  NOTION: process.env.NEXT_PUBLIC_NOTION_WORKER_URL || '',
} as const;

// Helper function for making requests
async function makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
}

// RAG Worker API
export const ragAPI = {
  // Chat with AI
  chat: async (message: string, projectId?: number) => {
    return makeRequest(`${WORKER_URLS.RAG}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, projectId }),
    });
  },

  // Search documents and transcripts
  search: async (query: string, limit = 10) => {
    return makeRequest(`${WORKER_URLS.RAG}/search`, {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  },

  // Vector search
  vectorSearch: async (query: string, limit = 10) => {
    return makeRequest(`${WORKER_URLS.RAG}/vector-search`, {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  },

  // Get meetings
  getMeetings: async () => {
    return makeRequest(`${WORKER_URLS.RAG}/meetings`);
  },

  // Sync transcripts
  syncTranscripts: async () => {
    return makeRequest(`${WORKER_URLS.RAG}/sync`, {
      method: 'POST',
    });
  },

  // Health check
  health: async () => {
    return makeRequest(`${WORKER_URLS.RAG}/test`);
  },
};

// Main API Worker (for projects, clients, meetings, etc.)
export const apiWorker = {
  // Projects
  projects: {
    list: async () => makeRequest(`${WORKER_URLS.API}/api/projects`),
    get: async (id: string) => makeRequest(`${WORKER_URLS.API}/api/projects/${id}`),
    create: async (data: any) => makeRequest(`${WORKER_URLS.API}/api/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: async (id: string, data: any) => makeRequest(`${WORKER_URLS.API}/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: async (id: string) => makeRequest(`${WORKER_URLS.API}/api/projects/${id}`, {
      method: 'DELETE',
    }),
  },

  // Clients
  clients: {
    list: async () => makeRequest(`${WORKER_URLS.API}/api/clients`),
    get: async (id: string) => makeRequest(`${WORKER_URLS.API}/api/clients/${id}`),
    create: async (data: any) => makeRequest(`${WORKER_URLS.API}/api/clients`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: async (id: string, data: any) => makeRequest(`${WORKER_URLS.API}/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: async (id: string) => makeRequest(`${WORKER_URLS.API}/api/clients/${id}`, {
      method: 'DELETE',
    }),
  },

  // Meetings
  meetings: {
    list: async () => makeRequest(`${WORKER_URLS.API}/api/meetings`),
    download: async (file: string) => `${WORKER_URLS.API}/api/meetings/download?file=${encodeURIComponent(file)}`,
    sync: async () => makeRequest(`${WORKER_URLS.API}/api/sync-meetings`, { method: 'POST' }),
    syncToD1: async () => makeRequest(`${WORKER_URLS.API}/api/sync-meetings-to-d1`, { method: 'POST' }),
  },

  // Documents
  documents: {
    list: async (params?: { limit?: number; type?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.type) queryParams.append('type', params.type);
      const queryString = queryParams.toString();
      return makeRequest(`${WORKER_URLS.API}/api/documents${queryString ? `?${queryString}` : ''}`);
    },
    analytics: async () => makeRequest(`${WORKER_URLS.API}/api/documents/analytics`),
  },

  // Sync operations
  sync: {
    status: async () => makeRequest(`${WORKER_URLS.API}/api/sync-status`),
    notionToD1: async () => makeRequest(`${WORKER_URLS.API}/api/sync-notion-to-d1`, { method: 'POST' }),
    notionClientsToD1: async () => makeRequest(`${WORKER_URLS.API}/api/sync-notion-clients-to-d1`, { method: 'POST' }),
  },

  // User
  user: async () => makeRequest(`${WORKER_URLS.API}/api/user`),

  // Test endpoints
  test: async () => makeRequest(`${WORKER_URLS.API}/api/test`),
  testR2: async () => makeRequest(`${WORKER_URLS.API}/api/test-r2`),
  checkD1Projects: async () => makeRequest(`${WORKER_URLS.API}/api/check-d1-projects`),
  listD1Projects: async () => makeRequest(`${WORKER_URLS.API}/api/list-d1-projects`),
  notionSchema: async () => makeRequest(`${WORKER_URLS.API}/api/notion-schema`),

  // Vectorization
  vectorization: {
    process: async () => makeRequest(`${WORKER_URLS.API}/api/vectorization/process`, { method: 'POST' }),
    status: async () => makeRequest(`${WORKER_URLS.API}/api/vectorization/status`),
  },
};

// Projects API (when deployed)
export const projectsAPI = {
  // Will be implemented when Projects worker is deployed
  health: async () => {
    if (!WORKER_URLS.PROJECTS) {
      throw new Error('Projects worker not yet deployed');
    }
    return makeRequest(`${WORKER_URLS.PROJECTS}/health`);
  },
};

// Notion API (when deployed)
export const notionAPI = {
  // Will be implemented when Notion worker is deployed
  health: async () => {
    if (!WORKER_URLS.NOTION) {
      throw new Error('Notion worker not yet deployed');
    }
    return makeRequest(`${WORKER_URLS.NOTION}/health`);
  },
};

// Combined API
export const workersAPI = {
  rag: ragAPI,
  api: apiWorker,
  projects: projectsAPI,
  notion: notionAPI,
};

export default workersAPI;