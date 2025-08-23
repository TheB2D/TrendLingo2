import { getBrowserService } from './browser-use-service';
import { BrowserTask } from '@/types/browser-use';

export class StreamingService {
  private browserService = getBrowserService();

  async createTaskWithStreaming(
    taskDescription: string,
    onProgress: (data: any) => void
  ): Promise<BrowserTask> {
    try {
      // Create the task
      const task = await this.browserService.createTask(taskDescription);
      
      // Start streaming progress
      const stream = await this.browserService.streamTaskProgress(task.id, onProgress);
      
      return task;
    } catch (error) {
      console.error('Failed to create task with streaming:', error);
      throw error;
    }
  }

  async streamExistingTask(
    taskId: string,
    onProgress: (data: any) => void
  ): Promise<void> {
    try {
      await this.browserService.streamTaskProgress(taskId, onProgress);
    } catch (error) {
      console.error('Failed to stream existing task:', error);
      throw error;
    }
  }
}

export const streamingService = new StreamingService();