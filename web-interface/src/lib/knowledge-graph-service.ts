import { neo4jService } from './neo4j-service';
import { llmService } from './llm-service';
import { AgentStep } from '@/types/browser-use';

// Natural library requires Node.js environment
let natural: any;
if (typeof window === 'undefined') {
  natural = require('natural');
}

interface ProcessedFragment {
  id: string;
  text: string;
  type: 'memory' | 'evaluation' | 'goal' | 'action';
  sessionId: string;
  taskId: string;
  stepNumber: number;
  timestamp: Date;
  url?: string;
  concepts: string[];
  semanticVector: number[];
}

export class KnowledgeGraphService {
  private static instance: KnowledgeGraphService;
  private tfidf: any;
  private processedFragments: Map<string, ProcessedFragment> = new Map();

  private constructor() {
    if (typeof window === 'undefined' && natural) {
      this.tfidf = new natural.TfIdf();
    }
  }

  public static getInstance(): KnowledgeGraphService {
    if (!KnowledgeGraphService.instance) {
      KnowledgeGraphService.instance = new KnowledgeGraphService();
    }
    return KnowledgeGraphService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const connected = await neo4jService.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to Neo4j database');
      }
      
      await neo4jService.initializeSchema();
      console.log('Knowledge Graph Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Knowledge Graph Service:', error);
      throw error;
    }
  }

  public async processAgentSteps(
    steps: AgentStep[],
    sessionId: string,
    taskId: string
  ): Promise<void> {
    try {
      console.log(`Processing ${steps.length} agent steps for knowledge graph`);
      
      const fragments: ProcessedFragment[] = [];

      // Extract reasoning fragments from each step
      for (const step of steps) {
        const stepFragments = await this.extractFragmentsFromStep(step, sessionId, taskId);
        fragments.push(...stepFragments);
      }

      // Process each fragment with LLM analysis
      for (const fragment of fragments) {
        await this.processFragment(fragment);
      }

      // Find and create relationships between fragments
      await this.createFragmentRelationships(fragments);

      console.log(`Processed ${fragments.length} reasoning fragments`);
    } catch (error) {
      console.error('Failed to process agent steps:', error);
      // Don't throw - continue with partial processing
    }
  }

  private async extractFragmentsFromStep(
    step: AgentStep,
    sessionId: string,
    taskId: string
  ): Promise<ProcessedFragment[]> {
    const fragments: ProcessedFragment[] = [];
    const timestamp = new Date();

    // Extract memory fragment
    if (step.memory && step.memory.trim()) {
      fragments.push({
        id: `memory_${sessionId}_${step.number}_${Date.now()}`,
        text: step.memory,
        type: 'memory',
        sessionId,
        taskId,
        stepNumber: step.number,
        timestamp,
        url: step.url,
        concepts: [],
        semanticVector: []
      });
    }

    // Extract evaluation fragment
    if (step.evaluationPreviousGoal && step.evaluationPreviousGoal.trim()) {
      fragments.push({
        id: `evaluation_${sessionId}_${step.number}_${Date.now()}`,
        text: step.evaluationPreviousGoal,
        type: 'evaluation',
        sessionId,
        taskId,
        stepNumber: step.number,
        timestamp,
        url: step.url,
        concepts: [],
        semanticVector: []
      });
    }

    // Extract goal fragment
    if (step.nextGoal && step.nextGoal.trim()) {
      fragments.push({
        id: `goal_${sessionId}_${step.number}_${Date.now()}`,
        text: step.nextGoal,
        type: 'goal',
        sessionId,
        taskId,
        stepNumber: step.number,
        timestamp,
        url: step.url,
        concepts: [],
        semanticVector: []
      });
    }

    // Extract action fragments
    if (step.actions && step.actions.length > 0) {
      step.actions.forEach((action, idx) => {
        if (action && action.trim()) {
          fragments.push({
            id: `action_${sessionId}_${step.number}_${idx}_${Date.now()}`,
            text: action,
            type: 'action',
            sessionId,
            taskId,
            stepNumber: step.number,
            timestamp,
            url: step.url,
            concepts: [],
            semanticVector: []
          });
        }
      });
    }

    return fragments;
  }

  private async processFragment(fragment: ProcessedFragment): Promise<void> {
    try {
      // Analyze with LLM
      const analysis = await llmService.analyzeReasoningFragment({
        text: fragment.text,
        type: fragment.type,
        stepNumber: fragment.stepNumber
      });

      // Generate semantic vector using TF-IDF
      if (this.tfidf && typeof window === 'undefined') {
        this.tfidf.addDocument(fragment.text);
      }
      const vector = this.generateSemanticVector(fragment.text);

      // Update fragment with analysis results
      fragment.concepts = analysis.concepts;
      fragment.semanticVector = vector;

      // Store in cache
      this.processedFragments.set(fragment.id, fragment);

      // Store in Neo4j
      await neo4jService.createReasonFragment({
        id: fragment.id,
        text: fragment.text,
        type: fragment.type,
        sessionId: fragment.sessionId,
        taskId: fragment.taskId,
        stepNumber: fragment.stepNumber,
        timestamp: fragment.timestamp,
        semanticVector: fragment.semanticVector,
        concepts: fragment.concepts,
        url: fragment.url
      });

      console.log(`Processed fragment: ${fragment.id} with ${fragment.concepts.length} concepts`);
    } catch (error) {
      console.error(`Failed to process fragment ${fragment.id}:`, error);
      // Continue processing other fragments
    }
  }

  private generateSemanticVector(text: string): number[] {
    if (typeof window !== 'undefined' || !natural) {
      // Simple word frequency on client side
      const words = text.toLowerCase().split(/\s+/);
      const wordCount: Record<string, number> = {};
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
      const vector = Object.values(wordCount).slice(0, 50);
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
    }

    // Simple TF-IDF based vector generation (server side)
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text.toLowerCase()) || [];
    const stemmed = tokens.map((token: string) => natural.PorterStemmer.stem(token));
    
    // Create a basic frequency vector
    const wordCount: Record<string, number> = {};
    stemmed.forEach((word: string) => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Convert to normalized vector (simplified)
    const vector = Object.values(wordCount).slice(0, 100); // Limit to 100 dimensions
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  private async createFragmentRelationships(fragments: ProcessedFragment[]): Promise<void> {
    try {
      // Group fragments by session for relationship analysis
      const fragmentData = fragments.map(f => ({
        id: f.id,
        text: f.text,
        type: f.type
      }));

      if (fragmentData.length < 2) {
        return; // Need at least 2 fragments for relationships
      }

      // Analyze relationships using LLM
      const relationships = await llmService.findFragmentRelationships(fragmentData);

      // Create relationships in Neo4j
      for (const rel of relationships) {
        try {
          await neo4jService.createSemanticRelationship(
            rel.fragmentId1,
            rel.fragmentId2,
            rel.relationshipType,
            rel.strength,
            { explanation: rel.explanation }
          );
        } catch (error) {
          console.error(`Failed to create relationship between ${rel.fragmentId1} and ${rel.fragmentId2}:`, error);
          // Continue with other relationships
        }
      }

      console.log(`Created ${relationships.length} relationships between fragments`);
    } catch (error) {
      console.error('Failed to create fragment relationships:', error);
      // Don't throw - relationships are optional
    }
  }

  public async findSimilarReasoningTraces(
    currentText: string,
    sessionId?: string,
    limit: number = 5
  ): Promise<Array<{
    id: string;
    text: string;
    type: string;
    similarity: number;
    sessionId: string;
  }>> {
    try {
      return await neo4jService.findSimilarFragments(currentText, sessionId, limit);
    } catch (error) {
      console.error('Failed to find similar reasoning traces:', error);
      return [];
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
    try {
      return await neo4jService.getSessionKnowledgeGraph(sessionId);
    } catch (error) {
      console.error('Failed to get session knowledge graph:', error);
      return { nodes: [], relationships: [] };
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
    try {
      return await neo4jService.getPooledKnowledgeGraph();
    } catch (error) {
      console.error('Failed to get pooled knowledge graph:', error);
      return { 
        nodes: [], 
        relationships: [], 
        sessionStats: { totalSessions: 0, totalFragments: 0, totalConcepts: 0 }
      };
    }
  }

  public async generateInsights(sessionId: string): Promise<{
    keyPatterns: string[];
    conceptClusters: Array<{
      name: string;
      concepts: string[];
      description: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const graph = await this.getSessionKnowledgeGraph(sessionId);
      
      if (graph.nodes.length === 0) {
        return {
          keyPatterns: [],
          conceptClusters: [],
          recommendations: []
        };
      }

      // Extract concepts from all fragments
      const allConcepts = graph.nodes
        .filter(node => node.type === 'ReasonFragment')
        .flatMap(node => node.properties.concepts || [])
        .filter((concept, index, array) => array.indexOf(concept) === index);

      // Generate concept hierarchy and clusters
      const hierarchy = await llmService.generateConceptHierarchy(allConcepts);

      // Generate basic insights
      const keyPatterns = [
        `Session contains ${graph.nodes.length} reasoning fragments`,
        `${graph.relationships.length} semantic relationships identified`,
        `${allConcepts.length} unique concepts extracted`
      ];

      const recommendations = [
        'Consider reviewing similar reasoning patterns from previous sessions',
        'Monitor frequently occurring concepts for optimization opportunities',
        'Analyze relationship patterns to improve automation strategies'
      ];

      return {
        keyPatterns,
        conceptClusters: hierarchy.clusters,
        recommendations
      };
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return {
        keyPatterns: [],
        conceptClusters: [],
        recommendations: []
      };
    }
  }

  public async cleanup(): Promise<void> {
    try {
      await neo4jService.close();
    } catch (error) {
      console.error('Failed to cleanup knowledge graph service:', error);
    }
  }
}

export const knowledgeGraphService = KnowledgeGraphService.getInstance();
