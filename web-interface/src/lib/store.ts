import { create } from 'zustand';
import { ChatMessage, BrowserSession } from '@/types/browser-use';
import { Node, Edge } from 'reactflow';
import { NodeStrand } from './workflow-utils';

interface StrandSession {
  strandId: string;
  session: BrowserSession | null;
  isActive: boolean;
}

interface AppState {
  // Chat state
  messages: ChatMessage[];
  isLoading: boolean;
  
  // Browser session state
  currentSession: BrowserSession | null;
  activeSessions: BrowserSession[];
  
  // Multi-strand session state
  strandSessions: StrandSession[];
  currentStrands: NodeStrand[];
  showMultipleBrowsers: boolean;
  
  // Workflow state
  workflowNodes: Node[];
  workflowEdges: Edge[];
  
  // UI state
  showLiveBrowser: boolean;
  selectedSessionId: string | null;
  isWorkflowMode: boolean;
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  setCurrentSession: (session: BrowserSession | null) => void;
  updateSession: (sessionId: string, updates: Partial<BrowserSession>) => void;
  addSession: (session: BrowserSession) => void;
  removeSession: (sessionId: string) => void;
  toggleLiveBrowser: () => void;
  selectSession: (sessionId: string | null) => void;
  clearChat: () => void;
  clearMessages: () => void;
  toggleWorkflowMode: () => void;
  setWorkflowMode: (mode: boolean) => void;
  setWorkflowNodes: (nodes: Node[]) => void;
  setWorkflowEdges: (edges: Edge[]) => void;
  updateWorkflow: (nodes: Node[], edges: Edge[]) => void;
  
  // Multi-strand actions
  setCurrentStrands: (strands: NodeStrand[]) => void;
  setStrandSession: (strandId: string, session: BrowserSession | null) => void;
  updateStrandSession: (strandId: string, updates: Partial<BrowserSession>) => void;
  toggleMultipleBrowsers: () => void;
  setShowMultipleBrowsers: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  messages: [],
  isLoading: false,
  currentSession: null,
  activeSessions: [],
  strandSessions: [],
  currentStrands: [],
  showMultipleBrowsers: false,
  workflowNodes: [],
  workflowEdges: [],
  showLiveBrowser: false,
  selectedSessionId: null,
  isWorkflowMode: false,

  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  setLoading: (loading) => set({ isLoading: loading }),
  
  setCurrentSession: (session) => {
    set({ currentSession: session });
    if (session && !get().showLiveBrowser) {
      set({ showLiveBrowser: true });
    }
  },
  
  updateSession: (sessionId, updates) => {
    set((state) => ({
      activeSessions: state.activeSessions.map((session) =>
        session.id === sessionId ? { ...session, ...updates } : session
      ),
      currentSession:
        state.currentSession?.id === sessionId
          ? { ...state.currentSession, ...updates }
          : state.currentSession,
    }));
  },

  addSession: (session) => {
    set((state) => ({
      activeSessions: [...state.activeSessions.filter(s => s.id !== session.id), session],
    }));
  },

  removeSession: (sessionId) => {
    set((state) => ({
      activeSessions: state.activeSessions.filter(s => s.id !== sessionId),
      currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
      showLiveBrowser: state.currentSession?.id === sessionId ? false : state.showLiveBrowser,
    }));
  },

  toggleLiveBrowser: () => set((state) => ({ 
    showLiveBrowser: !state.showLiveBrowser 
  })),
  
  selectSession: (sessionId) => {
    set({ selectedSessionId: sessionId });
    if (sessionId) {
      const session = get().activeSessions.find(s => s.id === sessionId);
      if (session) {
        set({ currentSession: session, showLiveBrowser: true });
      }
    }
  },
  
  clearChat: () => set({ 
    messages: [], 
    currentSession: null, 
    showLiveBrowser: false 
  }),

  clearMessages: () => set({ messages: [] }),
  
  toggleWorkflowMode: () => set((state) => ({ 
    isWorkflowMode: !state.isWorkflowMode 
  })),
  
  setWorkflowMode: (mode) => set({ isWorkflowMode: mode }),
  
  setWorkflowNodes: (nodes) => set({ workflowNodes: nodes }),
  
  setWorkflowEdges: (edges) => set({ workflowEdges: edges }),
  
  updateWorkflow: (nodes, edges) => set({ 
    workflowNodes: nodes, 
    workflowEdges: edges 
  }),
  
  // Multi-strand implementations
  setCurrentStrands: (strands) => set({ currentStrands: strands }),
  
  setStrandSession: (strandId, session) => {
    set((state) => ({
      strandSessions: [
        ...state.strandSessions.filter(s => s.strandId !== strandId),
        { strandId, session, isActive: session !== null }
      ]
    }));
  },
  
  updateStrandSession: (strandId, updates) => {
    set((state) => ({
      strandSessions: state.strandSessions.map(strandSession =>
        strandSession.strandId === strandId && strandSession.session
          ? {
              ...strandSession,
              session: { ...strandSession.session, ...updates }
            }
          : strandSession
      ),
      // Also update activeSessions if this session exists there
      activeSessions: state.activeSessions.map(session => {
        const strandSession = state.strandSessions.find(s => s.strandId === strandId);
        return strandSession?.session?.id === session.id 
          ? { ...session, ...updates } 
          : session;
      })
    }));
  },
  
  toggleMultipleBrowsers: () => set((state) => ({ 
    showMultipleBrowsers: !state.showMultipleBrowsers 
  })),
  
  setShowMultipleBrowsers: (show) => set({ showMultipleBrowsers: show }),
}));