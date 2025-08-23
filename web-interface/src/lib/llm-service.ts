import { GoogleGenerativeAI } from '@google/generative-ai';

interface ReasoningFragment {
  text: string;
  type: 'memory' | 'evaluation' | 'goal' | 'action';
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

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  public async analyzeReasoningFragment(fragment: ReasoningFragment): Promise<SemanticAnalysis> {
    try {
      const prompt = `
        Analyze the following reasoning fragment from a browser automation agent:

        Type: ${fragment.type}
        Text: "${fragment.text}"
        Step: ${fragment.stepNumber}
        ${fragment.context ? `Context: ${fragment.context}` : ''}

        Please provide a semantic analysis in the following JSON format:
        {
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

        Focus on:
        - Extracting key concepts and entities (websites, actions, goals, obstacles)
        - Identifying relationships between concepts
        - Understanding the semantic meaning and intent
        - Strength should be 0.0-1.0 representing confidence

        Respond with valid JSON only.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        // Clean the response text to extract JSON
        let cleanText = text.trim();
        
        // Remove markdown code blocks if present
        cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Try to find JSON object in the text
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanText = jsonMatch[0];
        }
        
        const analysis = JSON.parse(cleanText) as SemanticAnalysis;
        return analysis;
      } catch (parseError) {
        console.error('Failed to parse LLM response:', parseError);
        console.error('Raw response:', text);
        // Fallback analysis
        return this.createFallbackAnalysis(fragment);
      }
    } catch (error) {
      console.error('Failed to analyze reasoning fragment:', error);
      return this.createFallbackAnalysis(fragment);
    }
  }

  public async findFragmentRelationships(
    fragments: Array<{ id: string; text: string; type: string }>
  ): Promise<FragmentRelationship[]> {
    try {
      const prompt = `
        Analyze the relationships between these reasoning fragments from a browser automation session:

        ${fragments.map((f, i) => `
        Fragment ${i + 1} (ID: ${f.id}):
        Type: ${f.type}
        Text: "${f.text}"
        `).join('\n')}

        Identify semantic relationships between fragments. Consider:
        - Causal relationships (one leads to another)
        - Temporal relationships (sequence, before/after)
        - Conceptual relationships (similar goals, related actions)
        - Dependency relationships (one requires another)
        - Contradiction relationships (conflicting information)

        Provide response in JSON format:
        {
          "relationships": [
            {
              "fragmentId1": "id1",
              "fragmentId2": "id2", 
              "relationshipType": "CAUSAL|TEMPORAL|CONCEPTUAL|DEPENDENCY|CONTRADICTION|SIMILARITY",
              "strength": 0.8,
              "explanation": "Brief explanation of the relationship"
            }
          ]
        }

        Only include relationships with strength > 0.3. Respond with valid JSON only.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        // Clean the response text to extract JSON
        let cleanText = text.trim();
        
        // Remove markdown code blocks if present
        cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Try to find JSON object in the text
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
