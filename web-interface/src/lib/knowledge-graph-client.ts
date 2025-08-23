// Client-side knowledge graph service that calls the API

interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
}

interface KnowledgeRelationship {
  from: string;
  to: string;
  type: string;
  properties: Record<string, any>;
}

interface PooledGraphData {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
  sessionStats: {
    totalSessions: number;
    totalFragments: number;
    totalConcepts: number;
  };
}

interface SessionGraphData {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
}

export class KnowledgeGraphClient {
  private static instance: KnowledgeGraphClient;

  public static getInstance(): KnowledgeGraphClient {
    if (!KnowledgeGraphClient.instance) {
      KnowledgeGraphClient.instance = new KnowledgeGraphClient();
    }
    return KnowledgeGraphClient.instance;
  }

  public async getPooledKnowledgeGraph(): Promise<PooledGraphData> {
    try {
      const response = await fetch('/api/knowledge-graph?type=pooled');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch pooled knowledge graph:', error);
      return { 
        nodes: [], 
        relationships: [], 
        sessionStats: { totalSessions: 0, totalFragments: 0, totalConcepts: 0 }
      };
    }
  }

  public async getSessionKnowledgeGraph(sessionId: string): Promise<SessionGraphData> {
    try {
      const response = await fetch(`/api/knowledge-graph?type=session&sessionId=${sessionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch session knowledge graph:', error);
      return { nodes: [], relationships: [] };
    }
  }

  public async processAgentSteps(
    steps: any[],
    sessionId: string,
    taskId: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process-steps',
          data: { steps, sessionId, taskId }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to process agent steps:', error);
      return false;
    }
  }

  public async initialize(): Promise<boolean> {
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'initialize',
          data: {}
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to initialize knowledge graph:', error);
      return false;
    }
  }
}

export const knowledgeGraphClient = KnowledgeGraphClient.getInstance();
