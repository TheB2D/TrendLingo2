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
  private stepBasedQueue: Map<number, Array<{
    sessionId: string;
    fragment: any;
    stepNumber: number;
    timestamp: number;
    agentStep: AgentStep;
  }>> = new Map();
  private stepProcessingTimers: Map<number, NodeJS.Timeout> = new Map();
  private readonly STEP_COLLECTION_DELAY = 8000; // Wait 8 seconds for all sessions to complete a step
  private readonly MAX_SESSIONS_PER_STEP = 10; // Maximum sessions to wait for

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
      console.log(`Processing ${steps.length} agent steps for knowledge graph (step-based pooling)`);
      
      // Group steps by step number and queue for step-based processing
      for (const step of steps) {
        const stepNumber = step.stepNumber || 1;
        await this.queueStepForPooledProcessing(step, sessionId, taskId, stepNumber);
      }
      
      console.log(`Queued ${steps.length} steps for pooled processing`);
    } catch (error) {
      console.error('Failed to process agent steps:', error);
      // Don't throw - continue with partial processing
    }
  }

  private async queueStepForPooledProcessing(
    agentStep: AgentStep, 
    sessionId: string, 
    taskId: string, 
    stepNumber: number
  ): Promise<void> {
    // Extract fragments from this step
    const fragments = await this.extractFragmentsFromStep(agentStep, sessionId, taskId);
    
    // Add to step-based queue
    if (!this.stepBasedQueue.has(stepNumber)) {
      this.stepBasedQueue.set(stepNumber, []);
    }
    
    for (const fragment of fragments) {
      this.stepBasedQueue.get(stepNumber)!.push({
        sessionId,
        fragment,
        stepNumber,
        timestamp: Date.now(),
        agentStep
      });
    }
    
    // Clear existing timer for this step
    if (this.stepProcessingTimers.has(stepNumber)) {
      clearTimeout(this.stepProcessingTimers.get(stepNumber)!);
    }
    
    // Set timer to process this step after delay (allows other sessions to contribute)
    this.stepProcessingTimers.set(stepNumber, setTimeout(() => {
      this.processStepPool(stepNumber);
    }, this.STEP_COLLECTION_DELAY));
    
    // If we have enough sessions, process immediately
    const queuedItems = this.stepBasedQueue.get(stepNumber)!;
    const uniqueSessions = new Set(queuedItems.map(item => item.sessionId));
    
    if (uniqueSessions.size >= this.MAX_SESSIONS_PER_STEP) {
      clearTimeout(this.stepProcessingTimers.get(stepNumber)!);
      this.processStepPool(stepNumber);
    }
  }

  private async processStepPool(stepNumber: number): Promise<void> {
    console.log(`Processing pooled reasoning for step ${stepNumber}`);
    
    const queuedItems = this.stepBasedQueue.get(stepNumber);
    if (!queuedItems || queuedItems.length === 0) {
      return;
    }

    try {
      // Group by session for organized processing
      const sessionGroups = new Map<string, Array<any>>();
      for (const item of queuedItems) {
        if (!sessionGroups.has(item.sessionId)) {
          sessionGroups.set(item.sessionId, []);
        }
        sessionGroups.get(item.sessionId)!.push(item.fragment);
      }

      console.log(`Step ${stepNumber}: Processing ${queuedItems.length} fragments from ${sessionGroups.size} sessions`);

      // Create a single mega-prompt for all fragments from this step
      await this.processStepFragmentsBatch(Array.from(queuedItems), stepNumber);

      // Create cross-session relationships for this step
      const allFragments = queuedItems.map(item => item.fragment);
      if (allFragments.length > 1) {
        await this.createFragmentRelationships(allFragments);
      }

      console.log(`Completed pooled processing for step ${stepNumber}`);
    } catch (error) {
      console.error(`Error processing step pool ${stepNumber}:`, error);
    } finally {
      // Clean up
      this.stepBasedQueue.delete(stepNumber);
      this.stepProcessingTimers.delete(stepNumber);
    }
  }

  private async processStepFragmentsBatch(queuedItems: Array<any>, stepNumber: number): Promise<void> {
    console.log(`Batch processing ${queuedItems.length} fragments for step ${stepNumber}`);
    
    // Group fragments by session for organized LLM input
    const sessionData = new Map<string, Array<any>>();
    for (const item of queuedItems) {
      if (!sessionData.has(item.sessionId)) {
        sessionData.set(item.sessionId, []);
      }
      sessionData.get(item.sessionId)!.push(item.fragment);
    }

    // Create a single comprehensive prompt for all sessions in this step
    const megaPrompt = this.buildMegaPromptForStep(sessionData, stepNumber);
    
    try {
      // Single LLM call for all fragments in this step
      const analyses = await this.analyzeMegaBatch(megaPrompt, queuedItems);
      
      // Process and store each fragment with its analysis
      for (let i = 0; i < queuedItems.length; i++) {
        const item = queuedItems[i];
        const analysis = analyses[i] || this.createFallbackAnalysis(item.fragment);
        
        // Apply analysis to fragment
        item.fragment.concepts = analysis.concepts || [];
        item.fragment.semanticVector = this.generateSemanticVector(item.fragment.text);
        
        // Store in Neo4j
        await this.storeFragmentInNeo4j(item.fragment);
      }
      
      console.log(`Successfully processed ${queuedItems.length} fragments in step ${stepNumber} with single LLM call`);
    } catch (error) {
      console.error(`Failed mega-batch processing for step ${stepNumber}:`, error);
      
      // Fallback: process without LLM
      for (const item of queuedItems) {
        const fallbackAnalysis = this.createFallbackAnalysis(item.fragment);
        item.fragment.concepts = fallbackAnalysis.concepts || [];
        item.fragment.semanticVector = this.generateSemanticVector(item.fragment.text);
        await this.storeFragmentInNeo4j(item.fragment);
      }
    }
  }

  private buildMegaPromptForStep(sessionData: Map<string, Array<any>>, stepNumber: number): string {
    const sessionCount = sessionData.size;
    const totalFragments = Array.from(sessionData.values()).reduce((sum, fragments) => sum + fragments.length, 0);
    
    let prompt = `
CROSS-SESSION REASONING ANALYSIS - STEP ${stepNumber}
Analyzing reasoning from ${sessionCount} parallel browser automation sessions (${totalFragments} total fragments).
Extract concepts, entities, and insights that span across sessions.

`;

    let fragmentIndex = 0;
    for (const [sessionId, fragments] of sessionData) {
      prompt += `\n=== SESSION: ${sessionId} ===\n`;
      
      for (const fragment of fragments) {
        prompt += `
FRAGMENT ${fragmentIndex + 1} (Session: ${sessionId}):
Type: ${fragment.type}
Text: "${fragment.text}"
Step: ${fragment.stepNumber}
`;
        fragmentIndex++;
      }
    }

    prompt += `

Please provide analysis for ALL ${totalFragments} fragments in this JSON format:
{
  "analyses": [
    {
      "fragmentIndex": 0,
      "concepts": ["concept1", "concept2", ...],
      "entities": ["entity1", "entity2", ...],
      "summary": "Brief summary",
      "keyInsights": ["insight1", "insight2", ...]
    }
  ],
  "crossSessionInsights": [
    "Insight about patterns across sessions",
    "Common themes or divergent approaches"
  ]
}

Focus on:
- Key concepts and entities (websites, actions, goals)
- Cross-session patterns and similarities
- Divergent reasoning approaches
- Common obstacles and solutions

Respond with valid JSON only. Include analysis for all ${totalFragments} fragments.`;

    return prompt;
  }

  private async analyzeMegaBatch(prompt: string, queuedItems: Array<any>): Promise<Array<any>> {
    // Use the LLM service but with a custom mega-prompt
    try {
      const mockFragment = {
        text: prompt,
        type: 'mega_batch' as any,
        stepNumber: queuedItems[0]?.stepNumber || 1
      };
      
      // This will go through the batching system but as a single large request
      const result = await llmService.analyzeReasoningFragment(mockFragment);
      
      // Parse the result to extract individual analyses
      if (result && (result as any).analyses) {
        return (result as any).analyses;
      } else {
        // Fallback parsing
        return queuedItems.map(() => ({ concepts: [], entities: [], summary: '', keyInsights: [] }));
      }
    } catch (error) {
      console.error('Mega-batch analysis failed:', error);
      return queuedItems.map(() => ({ concepts: [], entities: [], summary: '', keyInsights: [] }));
    }
  }

  private async storeFragmentInNeo4j(fragment: ProcessedFragment): Promise<void> {
    try {
      await neo4jService.createReasonFragment({
        id: fragment.id,
        text: fragment.text,
        type: fragment.type,
        sessionId: fragment.sessionId,
        taskId: fragment.taskId,
        stepNumber: fragment.stepNumber,
        timestamp: fragment.timestamp,
        url: fragment.url,
        concepts: fragment.concepts,
        semanticVector: fragment.semanticVector
      });
      
      console.log(`Stored fragment: ${fragment.id} with ${fragment.concepts.length} concepts`);
    } catch (error) {
      console.error(`Failed to store fragment ${fragment.id}:`, error);
    }
  }

  private createFallbackAnalysis(fragment: any): any {
    // Simple keyword extraction as fallback
    const words = fragment.text.toLowerCase().split(/\s+/);
    const concepts = words.filter((word: string) => 
      word.length > 3 && 
      !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word)
    ).slice(0, 5);

    return {
      concepts,
      entities: [],
      summary: fragment.text.substring(0, 100) + '...',
      keyInsights: [`${fragment.type} step focusing on: ${concepts.join(', ')}`]
    };
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
