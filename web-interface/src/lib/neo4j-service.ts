// Note: This service should only be used on the server side
// Neo4j driver requires Node.js environment
let neo4j: any, Driver: any, Session: any, Result: any;

if (typeof window === 'undefined') {
  // Only import on server side
  const neo4jModule = require('neo4j-driver');
  neo4j = neo4jModule.default || neo4jModule;
  Driver = neo4jModule.Driver;
  Session = neo4jModule.Session;
  Result = neo4jModule.Result;
}

export class Neo4jService {
  private driver: any;
  private static instance: Neo4jService;

  private constructor() {
    if (typeof window === 'undefined' && neo4j) {
      this.driver = neo4j.driver(
        'bolt://localhost:7687',
        neo4j.auth.basic('neo4j', 'admin123')
      );
    }
  }

  public static getInstance(): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService();
    }
    return Neo4jService.instance;
  }

  public async testConnection(): Promise<boolean> {
    if (typeof window !== 'undefined' || !this.driver) {
      console.error('Neo4j service can only be used on server side');
      return false;
    }
    
    const session = this.driver.session();
    try {
      await session.run('RETURN 1 as test');
      return true;
    } catch (error) {
      console.error('Neo4j connection failed:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  public async initializeSchema(): Promise<void> {
    const session = this.driver.session();
    try {
      // Create constraints and indexes for better performance
      await session.run(`
        CREATE CONSTRAINT reason_fragment_id IF NOT EXISTS
        FOR (rf:ReasonFragment) REQUIRE rf.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT browser_session_id IF NOT EXISTS
        FOR (bs:BrowserSession) REQUIRE bs.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT task_id IF NOT EXISTS
        FOR (t:Task) REQUIRE t.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT concept_id IF NOT EXISTS
        FOR (c:Concept) REQUIRE c.id IS UNIQUE
      `);

      await session.run(`
        CREATE INDEX reason_fragment_text IF NOT EXISTS
        FOR (rf:ReasonFragment) ON (rf.text)
      `);

      await session.run(`
        CREATE INDEX concept_name IF NOT EXISTS
        FOR (c:Concept) ON (c.name)
      `);

      console.log('Neo4j schema initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Neo4j schema:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  public async createReasonFragment(data: {
    id: string;
    text: string;
    type: 'memory' | 'evaluation' | 'goal' | 'action';
    sessionId: string;
    taskId: string;
    stepNumber: number;
    timestamp: Date;
    semanticVector?: number[];
    concepts?: string[];
    url?: string;
  }): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        MERGE (bs:BrowserSession {id: $sessionId})
        MERGE (t:Task {id: $taskId})
        MERGE (t)-[:BELONGS_TO]->(bs)
        
        CREATE (rf:ReasonFragment {
          id: $id,
          text: $text,
          type: $type,
          stepNumber: $stepNumber,
          timestamp: $timestamp,
          url: $url,
          semanticVector: $semanticVector
        })
        
        CREATE (rf)-[:FROM_SESSION]->(bs)
        CREATE (rf)-[:FROM_TASK]->(t)
      `, {
        sessionId: data.sessionId,
        taskId: data.taskId,
        id: data.id,
        text: data.text,
        type: data.type,
        stepNumber: data.stepNumber,
        timestamp: data.timestamp.toISOString(),
        url: data.url || null,
        semanticVector: data.semanticVector || null
      });

      // Create concept relationships if provided
      if (data.concepts && data.concepts.length > 0) {
        for (const conceptName of data.concepts) {
          try {
            await session.run(`
              MATCH (rf:ReasonFragment {id: $fragmentId})
              MERGE (c:Concept {name: $conceptName, id: $conceptId})
              MERGE (rf)-[:CONTAINS_CONCEPT]->(c)
            `, {
              fragmentId: data.id,
              conceptName,
              conceptId: `concept_${conceptName.toLowerCase().replace(/\s+/g, '_')}`
            });
          } catch (conceptError: any) {
            // Ignore constraint violations for concepts - they can be shared
            if (!conceptError.code?.includes('ConstraintValidationFailed')) {
              throw conceptError;
            }
            console.log(`Concept '${conceptName}' already exists, linking to existing node`);
            
            // Try to link to existing concept
            await session.run(`
              MATCH (rf:ReasonFragment {id: $fragmentId})
              MATCH (c:Concept {id: $conceptId})
              MERGE (rf)-[:CONTAINS_CONCEPT]->(c)
            `, {
              fragmentId: data.id,
              conceptId: `concept_${conceptName.toLowerCase().replace(/\s+/g, '_')}`
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to create reason fragment:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  public async createSemanticRelationship(
    fromFragmentId: string,
    toFragmentId: string,
    relationshipType: string,
    strength: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (from:ReasonFragment {id: $fromId})
        MATCH (to:ReasonFragment {id: $toId})
        CREATE (from)-[r:${relationshipType} {
          strength: $strength,
          createdAt: datetime(),
          metadata: $metadata
        }]->(to)
      `, {
        fromId: fromFragmentId,
        toId: toFragmentId,
        strength,
        metadata: JSON.stringify(metadata || {})
      });
    } catch (error) {
      console.error('Failed to create semantic relationship:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  public async findSimilarFragments(
    text: string,
    sessionId?: string,
    limit: number = 10
  ): Promise<Array<{
    id: string;
    text: string;
    type: string;
    similarity: number;
  }>> {
    const session = this.driver.session();
    try {
      const query = sessionId
        ? `
          MATCH (rf:ReasonFragment)-[:FROM_SESSION]->(bs:BrowserSession {id: $sessionId})
          WHERE rf.text CONTAINS $searchText OR $searchText CONTAINS rf.text
          RETURN rf.id as id, rf.text as text, rf.type as type, 
                 1.0 as similarity
          LIMIT $limit
        `
        : `
          MATCH (rf:ReasonFragment)
          WHERE rf.text CONTAINS $searchText OR $searchText CONTAINS rf.text
          RETURN rf.id as id, rf.text as text, rf.type as type,
                 1.0 as similarity
          LIMIT $limit
        `;

      const result = await session.run(query, {
        searchText: text,
        sessionId,
        limit
      });

      return result.records.map(record => ({
        id: record.get('id'),
        text: record.get('text'),
        type: record.get('type'),
        similarity: record.get('similarity')
      }));
    } catch (error) {
      console.error('Failed to find similar fragments:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  public async getSessionKnowledgeGraph(sessionId: string): Promise<{
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      properties: Record<string, any>;
    }>;
    relationships: Array<{
      from: string;
      to: string;
      type: string;
      properties: Record<string, any>;
    }>;
  }> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (rf:ReasonFragment)-[:FROM_SESSION]->(bs:BrowserSession {id: $sessionId})
        OPTIONAL MATCH (rf)-[r]->(other)
        WHERE other:ReasonFragment OR other:Concept
        RETURN rf, r, other
      `, { sessionId });

      const nodes = new Map();
      const relationships = [];

      result.records.forEach(record => {
        const rf = record.get('rf');
        const relationship = record.get('r');
        const other = record.get('other');

        // Add reason fragment node
        if (rf && !nodes.has(rf.properties.id)) {
          nodes.set(rf.properties.id, {
            id: rf.properties.id,
            label: rf.properties.text.substring(0, 50) + '...',
            type: 'ReasonFragment',
            properties: rf.properties
          });
        }

        // Add other node if exists
        if (other && !nodes.has(other.properties.id)) {
          nodes.set(other.properties.id, {
            id: other.properties.id,
            label: other.labels[0] === 'Concept' 
              ? other.properties.name 
              : other.properties.text?.substring(0, 50) + '...',
            type: other.labels[0],
            properties: other.properties
          });
        }

        // Add relationship if exists
        if (relationship && other) {
          relationships.push({
            from: rf.properties.id,
            to: other.properties.id,
            type: relationship.type,
            properties: relationship.properties
          });
        }
      });

      return {
        nodes: Array.from(nodes.values()),
        relationships
      };
    } catch (error) {
      console.error('Failed to get session knowledge graph:', error);
      return { nodes: [], relationships: [] };
    } finally {
      await session.close();
    }
  }

  public async getPooledKnowledgeGraph(): Promise<{
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      properties: Record<string, any>;
    }>;
    relationships: Array<{
      from: string;
      to: string;
      type: string;
      properties: Record<string, any>;
    }>;
    sessionStats: {
      totalSessions: number;
      totalFragments: number;
      totalConcepts: number;
    };
  }> {
    const session = this.driver.session();
    try {
      // Get all nodes and relationships across all sessions
      const graphResult = await session.run(`
        MATCH (rf:ReasonFragment)
        OPTIONAL MATCH (rf)-[r]->(other)
        WHERE other:ReasonFragment OR other:Concept
        RETURN rf, r, other
      `);

      // Get statistics
      const statsResult = await session.run(`
        MATCH (bs:BrowserSession) 
        WITH count(bs) as sessionCount
        MATCH (rf:ReasonFragment) 
        WITH sessionCount, count(rf) as fragmentCount
        MATCH (c:Concept) 
        RETURN sessionCount as totalSessions, fragmentCount as totalFragments, count(c) as totalConcepts
      `);

      const nodes = new Map();
      const relationships = [];

      // Process graph data
      graphResult.records.forEach(record => {
        const rf = record.get('rf');
        const relationship = record.get('r');
        const other = record.get('other');

        // Add reason fragment node
        if (rf && !nodes.has(rf.properties.id)) {
          nodes.set(rf.properties.id, {
            id: rf.properties.id,
            label: rf.properties.text ? rf.properties.text.substring(0, 50) + '...' : 'Fragment',
            type: 'ReasonFragment',
            properties: {
              ...rf.properties,
              nodeType: rf.properties.type,
              stepNumber: rf.properties.stepNumber,
              timestamp: rf.properties.timestamp
            }
          });
        }

        // Add other node if exists
        if (other && !nodes.has(other.properties.id)) {
          const isConceptNode = other.labels.includes('Concept');
          nodes.set(other.properties.id, {
            id: other.properties.id,
            label: isConceptNode 
              ? other.properties.name 
              : (other.properties.text ? other.properties.text.substring(0, 50) + '...' : 'Node'),
            type: other.labels[0],
            properties: {
              ...other.properties,
              nodeType: isConceptNode ? 'concept' : other.properties.type
            }
          });
        }

        // Add relationship if exists
        if (relationship && other) {
          relationships.push({
            from: rf.properties.id,
            to: other.properties.id,
            type: relationship.type,
            properties: {
              ...relationship.properties,
              strength: relationship.properties.strength || 1.0,
              createdAt: relationship.properties.createdAt
            }
          });
        }
      });

      // Get stats
      const stats = statsResult.records.length > 0 ? {
        totalSessions: statsResult.records[0].get('totalSessions')?.toNumber() || 0,
        totalFragments: statsResult.records[0].get('totalFragments')?.toNumber() || 0,
        totalConcepts: statsResult.records[0].get('totalConcepts')?.toNumber() || 0
      } : { totalSessions: 0, totalFragments: 0, totalConcepts: 0 };

      return {
        nodes: Array.from(nodes.values()),
        relationships,
        sessionStats: stats
      };
    } catch (error) {
      console.error('Failed to get pooled knowledge graph:', error);
      return { 
        nodes: [], 
        relationships: [], 
        sessionStats: { totalSessions: 0, totalFragments: 0, totalConcepts: 0 }
      };
    } finally {
      await session.close();
    }
  }

  public async close(): Promise<void> {
    await this.driver.close();
  }
}

export const neo4jService = Neo4jService.getInstance();
