export interface BrowserSession {
  id: string;
  status: 'active' | 'stopped';
  liveUrl: string | null;
  recordUrl: string | null;
  publicShareUrl: string | null;
  startedAt: string;
  finishedAt: string | null;
  tasks: BrowserTask[];
}

export interface BrowserTask {
  id: string;
  sessionId: string;
  llm: string;
  task: string;
  status: 'started' | 'paused' | 'finished' | 'stopped';
  startedAt: string;
  finishedAt: string | null;
  metadata: Record<string, any>;
  isScheduled: boolean;
  doneOutput: string | null;
  browserUseVersion: string | null;
  isSuccess: boolean | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sessionId?: string;
  taskId?: string;
}

export interface TaskStreamMessage {
  status: string;
  data?: {
    session?: {
      id: string;
      liveUrl: string;
      recordingUrl?: string;
    };
  };
  error?: string;
  parsedOutput?: any;
}