import BrowserUse from "browser-use-sdk";
import { BrowserSession, BrowserTask } from "@/types/browser-use";
import { knowledgeGraphClient } from "./knowledge-graph-client";

export class BrowserUseService {
  private client: BrowserUse;
  private isKnowledgeGraphInitialized: boolean = false;

  constructor() {
    this.client = new BrowserUse({
      apiKey: process.env.NEXT_PUBLIC_BROWSER_USE_API_KEY || "",
    });
    this.initializeKnowledgeGraph();
  }

  private async initializeKnowledgeGraph(): Promise<void> {
    try {
      const success = await knowledgeGraphClient.initialize();
      this.isKnowledgeGraphInitialized = success;
      console.log('Knowledge graph service initialized:', success);
    } catch (error) {
      console.error('Failed to initialize knowledge graph service:', error);
      // Don't fail the service if knowledge graph fails
      this.isKnowledgeGraphInitialized = false;
    }
  }

  async createTaskAndGetSession(taskDescription: string): Promise<{
    session: BrowserSession;
    task: BrowserTask;
  }> {
    try {
      const task = await this.client.tasks.create({
        task: taskDescription,
      });

      // Wait a moment for the session to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));

      const session = await this.client.sessions.retrieve(task.sessionId);
      
      return { 
        session: session as BrowserSession, 
        task: task as BrowserTask 
      };
    } catch (error) {
      console.error('Failed to create task and get session:', error);
      throw error;
    }
  }

  async getSessionInfo(sessionId: string): Promise<BrowserSession | null> {
    try {
      const session = await this.client.sessions.retrieve(sessionId);
      return session as BrowserSession;
    } catch (error) {
      console.error('Failed to get session info:', error);
      return null;
    }
  }

  async streamTaskProgress(
    taskId: string,
    onProgress: (data: any) => void
  ): Promise<void> {
    try {
      console.log('Starting stream for task:', taskId);
      const stream = this.client.tasks.stream(taskId);
      
      for await (const chunk of stream) {
        console.log('Stream chunk received:', chunk);
        console.log('Chunk data:', chunk.data);
        console.log('Chunk data steps:', chunk.data?.steps);
        console.log('Chunk data steps type:', typeof chunk.data?.steps);
        console.log('Chunk data steps array check:', Array.isArray(chunk.data?.steps));
        
        // Process steps for knowledge graph if available
        if (this.isKnowledgeGraphInitialized && 
            chunk.data?.steps && 
            Array.isArray(chunk.data.steps) &&
            chunk.data.sessionId) {
          try {
            await knowledgeGraphClient.processAgentSteps(
              chunk.data.steps,
              chunk.data.sessionId,
              taskId
            );
            console.log('Processed steps for knowledge graph');
          } catch (error) {
            console.error('Failed to process steps for knowledge graph:', error);
            // Don't fail the stream - knowledge graph is optional
          }
        }
        
        onProgress(chunk);
        
        // Stop streaming when task is finished
        if (chunk.data?.status === 'finished' || chunk.data?.status === 'stopped') {
          console.log('Task completed, stopping stream');
          break;
        }
      }
    } catch (error) {
      console.error('Failed to stream task progress:', error);
      throw error;
    }
  }

  async createTask(taskDescription: string): Promise<BrowserTask> {
    try {
      const task = await this.client.tasks.create({
        task: taskDescription,
      });
      return task as BrowserTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }
}

// Create a singleton instance
let browserService: BrowserUseService;

export function getBrowserService(): BrowserUseService {
  if (!browserService) {
    browserService = new BrowserUseService();
  }
  return browserService;
}