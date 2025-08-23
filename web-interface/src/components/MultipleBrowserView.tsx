'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getBrowserService } from '@/lib/browser-use-service';
import { ExternalLink, RefreshCw, Monitor, Clock, CheckCircle, XCircle, Grid, Maximize2, Brain, Bug } from 'lucide-react';
import { BrowserSession } from '@/types/browser-use';
import { AgentThoughts } from './AgentThoughts';
import { DebugSteps } from './DebugSteps';

const browserService = getBrowserService();

interface BrowserPanelProps {
  session: BrowserSession | null;
  strandId: string;
  isExpanded?: boolean;
  onExpand?: () => void;
  showReasoning?: boolean;
  onToggleReasoning?: () => void;
}

function BrowserPanel({ session, strandId, isExpanded = false, onExpand, showReasoning = false, onToggleReasoning }: BrowserPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { updateStrandSession } = useAppStore();

  const refreshSession = async () => {
    if (!session?.id) return;
    
    setIsRefreshing(true);
    try {
      const updatedSession = await browserService.getSessionInfo(session.id);
      if (updatedSession) {
        updateStrandSession(strandId, updatedSession);
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (session?.status === 'active') {
      const interval = setInterval(refreshSession, 2000);
      return () => clearInterval(interval);
    }
  }, [session?.id, session?.status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'stopped':
        return <XCircle className="w-3 h-3 text-red-600" />;
      default:
        return <Clock className="w-3 h-3 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'stopped':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (!session) {
    return (
      <div className="h-full bg-gray-50 border border-gray-200 rounded-lg flex flex-col">
        {/* Header */}
        <div className="p-2 border-b border-gray-200 bg-gray-100 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              {strandId}
            </h4>
            {onExpand && (
              <button
                onClick={onExpand}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Expand"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Monitor className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-xs text-gray-500">No active session</p>
            <p className="text-xs text-gray-400 mt-1">Run workflow to start</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full bg-white border border-gray-200 rounded-lg flex flex-col ${isExpanded ? 'shadow-lg' : ''}`}>
      {/* Header */}
      <div className="p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1 truncate">
              <Monitor className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{strandId}</span>
            </h4>
            <p className="text-xs text-gray-500 truncate">
              {session.id.slice(0, 6)}...{session.id.slice(-2)}
            </p>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(session.status)}`}>
              {getStatusIcon(session.status)}
              <span className="hidden sm:inline">{session.status}</span>
            </div>

            <button
              onClick={refreshSession}
              disabled={isRefreshing}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {session.liveUrl && (
              <a
                href={session.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {onToggleReasoning && (
              <button
                onClick={onToggleReasoning}
                className={`p-1 rounded transition-colors ${
                  showReasoning 
                    ? 'text-purple-600 hover:text-purple-700 bg-purple-100' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title={showReasoning ? 'Hide Reasoning' : 'Show Reasoning'}
              >
                <Brain className="w-3 h-3" />
              </button>
            )}

            {onExpand && (
              <button
                onClick={onExpand}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Expand"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {showReasoning ? (
          <div className="flex w-full">
            {/* Browser View - Left Side */}
            <div className="flex-1 relative">
              {session.liveUrl ? (
                <iframe
                  src={session.liveUrl}
                  className="w-full h-full border-0 absolute inset-0"
                  title={`Live Browser View - ${strandId}`}
                  allow="fullscreen"
                  frameBorder="0"
                  scrolling="auto"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <div className="animate-pulse">
                      <Monitor className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Loading...</p>
                    <p className="text-xs text-gray-500 mt-1">Processing workflow</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reasoning View - Right Side */}
            <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
              <div className="p-2 border-b border-gray-200 bg-purple-50">
                <div className="flex items-center gap-1">
                  <Brain className="w-3 h-3 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">Reasoning</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {session?.tasks && session.tasks.length > 0 && (
                  <div className="h-full">
                    <div className="p-2 border-b border-gray-100">
                      <DebugSteps />
                    </div>
                    <div className="flex-1">
                      <AgentThoughts 
                        steps={session.tasks[session.tasks.length - 1]?.steps || []} 
                        isActive={session.status === 'active'} 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full relative">
            {session.liveUrl ? (
              <iframe
                src={session.liveUrl}
                className="w-full h-full border-0 absolute inset-0"
                title={`Live Browser View - ${strandId}`}
                allow="fullscreen"
                frameBorder="0"
                scrolling="auto"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center">
                  <div className="animate-pulse">
                    <Monitor className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  </div>
                  <p className="text-xs text-gray-600 font-medium">Loading...</p>
                  <p className="text-xs text-gray-500 mt-1">Processing workflow</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Summary */}
      {session.tasks && session.tasks.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-2 py-1 rounded-b-lg flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Tasks: {session.tasks.length}</span>
            {session.tasks.length > 0 && (
              <div className={`px-1 py-0.5 rounded text-xs ${getStatusColor(session.tasks[session.tasks.length - 1].status)}`}>
                {session.tasks[session.tasks.length - 1].status}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MultipleBrowserView() {
  const { 
    strandSessions, 
    currentStrands, 
    showMultipleBrowsers, 
    toggleMultipleBrowsers 
  } = useAppStore();
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [reasoningStates, setReasoningStates] = useState<{[strandId: string]: boolean}>({});

  const toggleStrandReasoning = (strandId: string) => {
    setReasoningStates(prev => ({
      ...prev,
      [strandId]: !prev[strandId]
    }));
  };

  const toggleAllReasoning = () => {
    const anyReasoningActive = Object.values(reasoningStates).some(Boolean);
    const newState: {[strandId: string]: boolean} = {};
    displayStrands.forEach(strand => {
      newState[strand.id] = !anyReasoningActive;
    });
    setReasoningStates(newState);
  };

  const hasActiveReasoning = Object.values(reasoningStates).some(Boolean);

  // Get up to 4 strands for display
  const displayStrands = currentStrands.slice(0, 4);
  const strandCount = displayStrands.length;

  if (!showMultipleBrowsers || strandCount === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <Grid className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">Multiple Browser View</p>
          <p className="text-sm text-gray-500 mt-2">
            Create workflow strands to see multiple live browser instances
          </p>
        </div>
      </div>
    );
  }

  // Calculate grid layout
  const getGridLayout = (count: number) => {
    switch (count) {
      case 1:
        return 'grid-cols-1 grid-rows-1';
      case 2:
        return 'grid-cols-2 grid-rows-1';
      case 3:
        return 'grid-cols-2 grid-rows-2';
      case 4:
        return 'grid-cols-2 grid-rows-2';
      default:
        return 'grid-cols-2 grid-rows-2';
    }
  };

  const gridClass = getGridLayout(strandCount);

  if (expandedPanel) {
    const expandedStrand = displayStrands.find(s => s.id === expandedPanel);
    const expandedSession = strandSessions.find(ss => ss.strandId === expandedPanel)?.session || null;

    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Expanded View - {expandedPanel}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleStrandReasoning(expandedPanel)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  reasoningStates[expandedPanel]
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Brain className="w-3 h-3" />
                Reasoning
              </button>
              <button
                onClick={() => setExpandedPanel(null)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Back to Grid
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Panel */}
        <div className="flex-1 p-4">
          <BrowserPanel 
            session={expandedSession} 
            strandId={expandedPanel}
            isExpanded={true}
            showReasoning={reasoningStates[expandedPanel] || false}
            onToggleReasoning={() => toggleStrandReasoning(expandedPanel)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Grid className="w-5 h-5" />
              Multiple Browser View
            </h3>
            <p className="text-sm text-gray-600">
              {strandCount} active strand{strandCount !== 1 ? 's' : ''} • Up to 4 screens supported
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAllReasoning}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                hasActiveReasoning
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Brain className="w-3 h-3" />
              {hasActiveReasoning ? 'Hide All' : 'Show All'} Reasoning
            </button>
            <button
              onClick={toggleMultipleBrowsers}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Hide Grid
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 p-4">
        <div className={`grid ${gridClass} gap-4 h-full`}>
          {displayStrands.map((strand) => {
            const strandSession = strandSessions.find(ss => ss.strandId === strand.id);
            return (
              <div key={strand.id} className="min-h-0">
                <BrowserPanel 
                  session={strandSession?.session || null} 
                  strandId={strand.id}
                  onExpand={() => setExpandedPanel(strand.id)}
                  showReasoning={reasoningStates[strand.id] || false}
                  onToggleReasoning={() => toggleStrandReasoning(strand.id)}
                />
              </div>
            );
          })}
          
          {/* Fill empty slots for better grid layout */}
          {Array.from({ length: Math.max(0, (strandCount === 3 ? 4 : strandCount) - strandCount) }).map((_, index) => (
            <div key={`empty-${index}`} className="min-h-0">
              <div className="h-full bg-gray-100 border border-gray-200 border-dashed rounded-lg flex items-center justify-center">
                <p className="text-xs text-gray-400">Empty Slot</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {strandCount > 4 && (
        <div className="p-3 border-t border-gray-200 bg-yellow-50">
          <p className="text-sm text-yellow-800 text-center">
            ⚠️ Only showing first 4 strands. You have {strandCount} total strands.
          </p>
        </div>
      )}
    </div>
  );
}