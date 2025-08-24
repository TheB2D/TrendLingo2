import { GoogleGenerativeAI } from '@google/generative-ai';

interface ReasoningFragment {
  text: string;
  type: 'memory' | 'evaluation' | 'goal' | 'action' | 'mega_batch';
  context?: string;
  stepNumber: number;
}

interface SemanticAnalysis {
  concepts: string[];
  entities: string[];
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    strength: number;
  }>;
  summary: string;
  keyInsights: string[];
}

interface FragmentRelationship {
  fragmentId1: string;
  fragmentId2: string;
  relationshipType: string;
  strength: number;
  explanation: string;
}

export class LLMService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private requestQueue: Array<{ id: string; fragment: ReasoningFragment; resolve: Function; reject: Function }> = [];
  private processingBatch = false;
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 8; // Process up to 8 fragments at once (increased efficiency)
  private readonly BATCH_DELAY = 1500; // Wait 1.5 seconds before processing batch
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 12; // Conservative limit for free tier

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  public async analyzeReasoningFragment(fragment: ReasoningFragment): Promise<SemanticAnalysis> {
    // Handle mega-batch requests directly (bypass normal batching)
    if (fragment.type === 'mega_batch') {
      return this.processMegaBatch(fragment.text);
    }
    
    // Use batching to reduce API calls for normal fragments
    return new Promise((resolve, reject) => {
      const id = `${fragment.type}_${fragment.stepNumber}_${Date.now()}`;
      this.requestQueue.push({ id, fragment, resolve, reject });
      this.scheduleBatchProcessing();
    });
  }

  private async processMegaBatch(megaPrompt: string): Promise<any> {
    console.log('Processing mega-batch prompt for cross-session analysis');
    
    // Check rate limits
    await this.enforceRateLimit();
    
    try {
      const result = await this.model.generateContent(megaPrompt);
      const response = await result.response;
      const text = response.text();

      try {
        // Clean the response text to extract JSON
        let cleanText = text.trim();
        cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanText = jsonMatch[0];
        }
        
        const megaResult = JSON.parse(cleanText);
        console.log(`Mega-batch processed successfully: ${megaResult.analyses?.length || 0} analyses`);
        
        return megaResult; // Return full result including analyses array
      } catch (parseError) {
        console.error('Failed to parse mega-batch LLM response:', parseError);
        console.error('Raw response:', text);
        return { analyses: [] };
      }
    } catch (error) {
      console.error('Failed to process mega-batch:', error);
      return { analyses: [] };
    }
  }

  private scheduleBatchProcessing() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);

    // Process immediately if batch is full
    if (this.requestQueue.length >= this.BATCH_SIZE) {
      clearTimeout(this.batchTimeout);
      this.processBatch();
    }
  }

  private async processBatch() {
    if (this.processingBatch || this.requestQueue.length === 0) {
      return;
    }

    this.processingBatch = true;
    const batch = this.requestQueue.splice(0, this.BATCH_SIZE);

    try {
      const results = await this.analyzeFragmentBatch(batch.map(item => item.fragment));
      
      // Resolve each request with its corresponding result
      batch.forEach((item, index) => {
        if (results[index]) {
          item.resolve(results[index]);
        } else {
          item.resolve(this.createFallbackAnalysis(item.fragment));
        }
      });
    } catch (error) {
      console.error('Batch processing failed:', error);
      // Fallback: resolve each with fallback analysis
      batch.forEach(item => {
        item.resolve(this.createFallbackAnalysis(item.fragment));
      });
    } finally {
      this.processingBatch = false;
      
      // Process next batch if queue has items
      if (this.requestQueue.length > 0) {
        this.scheduleBatchProcessing();
      }
    }
  }

  private async analyzeFragmentBatch(fragments: ReasoningFragment[]): Promise<SemanticAnalysis[]> {
    // Check rate limits
    await this.enforceRateLimit();

    try {
      const prompt = `
        Analyze the following ${fragments.length} reasoning fragments from a browser automation agent session.
        For each fragment, provide a semantic analysis. Be concise but comprehensive.

        ${fragments.map((fragment, index) => `
        FRAGMENT ${index + 1}:
        Type: ${fragment.type}
        Text: "${fragment.text}"
        Step: ${fragment.stepNumber}
        ${fragment.context ? `Context: ${fragment.context}` : ''}
        `).join('\n')}

        Please provide analysis for ALL fragments in the following JSON format:
        {
          "analyses": [
            {
              "fragmentIndex": 0,
              "concepts": ["concept1", "concept2", ...],
              "entities": ["entity1", "entity2", ...],
              "relationships": [
                {
                  "from": "entity/concept",
                  "to": "entity/concept", 
                  "type": "relationship_type",
                  "strength": 0.8
                }
              ],
              "summary": "Brief summary of the fragment",
              "keyInsights": ["insight1", "insight2", ...]
            }
          ]
        }

        Focus on:
        - Extracting key concepts and entities (websites, actions, goals, obstacles)
        - Identifying relationships between concepts
        - Understanding the semantic meaning and intent
        - Strength should be 0.0-1.0 representing confidence

        Respond with valid JSON only. Include analysis for all ${fragments.length} fragments.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        // Clean the response text to extract JSON
        let cleanText = text.trim();
        cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanText = jsonMatch[0];
        }
        
        const batchResult = JSON.parse(cleanText);
        const analyses = batchResult.analyses || [];
        
        // Ensure we have results for all fragments
        const results: SemanticAnalysis[] = [];
        for (let i = 0; i < fragments.length; i++) {
          const analysis = analyses.find((a: any) => a.fragmentIndex === i);
          if (analysis) {
            results.push({
              concepts: analysis.concepts || [],
              entities: analysis.entities || [],
              relationships: analysis.relationships || [],
              summary: analysis.summary || '',
              keyInsights: analysis.keyInsights || []
            });
          } else {
            results.push(this.createFallbackAnalysis(fragments[i]));
          }
        }
        
        return results;
      } catch (parseError) {
        console.error('Failed to parse batch LLM response:', parseError);
        console.error('Raw response:', text);
        return fragments.map(f => this.createFallbackAnalysis(f));
      }
    } catch (error) {
      console.error('Failed to analyze reasoning fragment batch:', error);
      return fragments.map(f => this.createFallbackAnalysis(f));
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset count if window has passed
    if (now - this.lastRequestTime > this.RATE_LIMIT_WINDOW) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    // If we're at the limit, wait
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = this.RATE_LIMIT_WINDOW - (now - this.lastRequestTime);
      console.log(`Rate limit reached, waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    }
    
    this.requestCount++;
  }

  public async findFragmentRelationships(
    fragments: Array<{ id: string; text: string; type: string }>
  ): Promise<FragmentRelationship[]> {
    // Skip relationship analysis if too few fragments or to reduce API calls
    if (fragments.length < 2 || fragments.length > 10) {
      console.log(`Skipping relationship analysis for ${fragments.length} fragments (optimizing API usage)`);
      return [];
    }

    // Check rate limits
    await this.enforceRateLimit();

    try {
      const prompt = `
        Analyze relationships between these ${fragments.length} reasoning fragments from browser automation.
        Be selective - only identify STRONG relationships (strength > 0.6).

        ${fragments.map((f, i) => `
        Fragment ${i + 1} (ID: ${f.id}):
        Type: ${f.type}
        Text: "${f.text}"
        `).join('\n')}

        Focus on:
        - CAUSAL: One fragment directly causes another
        - TEMPORAL: Clear sequence/ordering
        - CONCEPTUAL: Same goal/theme
        - DEPENDENCY: One requires another

        JSON format:
        {
          "relationships": [
            {
              "fragmentId1": "id1",
              "fragmentId2": "id2", 
              "relationshipType": "CAUSAL|TEMPORAL|CONCEPTUAL|DEPENDENCY",
              "strength": 0.8,
              "explanation": "Brief explanation"
            }
          ]
        }

        Only include strong relationships (strength > 0.6). Respond with valid JSON only.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        // Clean the response text to extract JSON
        let cleanText = text.trim();
        cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanText = jsonMatch[0];
        }
        
        const analysis = JSON.parse(cleanText);
        return analysis.relationships || [];
      } catch (parseError) {
        console.error('Failed to parse relationship analysis:', parseError);
        console.error('Raw response:', text);
        return [];
      }
    } catch (error) {
      console.error('Failed to analyze fragment relationships:', error);
      return [];
    }
  }

  public async generateConceptHierarchy(concepts: string[]): Promise<{
    hierarchy: Array<{
      parent: string;
      children: string[];
      level: number;
    }>;
    clusters: Array<{
      name: string;
      concepts: string[];
      description: string;
    }>;
  }> {
    try {
      const prompt = `
        Given these concepts extracted from browser automation reasoning:
        ${concepts.map(c => `- ${c}`).join('\n')}

        Create a conceptual hierarchy and cluster related concepts:

        Respond in JSON format:
        {
          "hierarchy": [
            {
              "parent": "parent_concept",
              "children": ["child1", "child2"],
              "level": 1
            }
          ],
          "clusters": [
            {
              "name": "cluster_name",
              "concepts": ["concept1", "concept2"],
              "description": "Description of what this cluster represents"
            }
          ]
        }

        Focus on grouping related web automation concepts, UI elements, and goals.
        Respond with valid JSON only.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse concept hierarchy:', parseError);
        return { hierarchy: [], clusters: [] };
      }
    } catch (error) {
      console.error('Failed to generate concept hierarchy:', error);
      return { hierarchy: [], clusters: [] };
    }
  }

  private createFallbackAnalysis(fragment: ReasoningFragment): SemanticAnalysis {
    // Simple keyword extraction as fallback
    const words = fragment.text.toLowerCase().split(/\s+/);
    const concepts = words.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word)
    ).slice(0, 5);

    return {
      concepts,
      entities: [],
      relationships: [],
      summary: fragment.text.substring(0, 100) + '...',
      keyInsights: [`${fragment.type} step focusing on: ${concepts.join(', ')}`]
    };
  }
}

export const llmService = new LLMService();
