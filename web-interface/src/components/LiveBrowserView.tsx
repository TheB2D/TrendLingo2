'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getBrowserService } from '@/lib/browser-use-service';
import { AgentThoughts } from './AgentThoughts';
import { DebugSteps } from './DebugSteps';
import { ExternalLink, RefreshCw, Monitor, Clock, CheckCircle, XCircle, Brain } from 'lucide-react';

const browserService = getBrowserService();

export function LiveBrowserView() {
  const { currentSession, showLiveBrowser, updateSession } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [agentSteps, setAgentSteps] = useState<any[]>([]);
  const [showAgentThoughts, setShowAgentThoughts] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);

  const refreshSession = async () => {
    if (!currentSession?.id) return;
    
    setIsRefreshing(true);
    try {
      const updatedSession = await browserService.getSessionInfo(currentSession.id);
      if (updatedSession) {
        updateSession(currentSession.id, updatedSession);
        
        // Update agent steps if tasks have steps
        if (updatedSession.tasks && updatedSession.tasks.length > 0) {
          const latestTask = updatedSession.tasks[updatedSession.tasks.length - 1];
          console.log('Latest task:', latestTask);
          console.log('Latest task steps:', latestTask.steps);
          if (latestTask.steps) {
            console.log('Updating agent steps:', latestTask.steps.length);
            setAgentSteps(latestTask.steps);
          } else {
            console.log('No steps found in latest task');
          }
        } else {
          console.log('No tasks found in session');
        }
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentSession?.status === 'active') {
      const interval = setInterval(refreshSession, 3000); // Refresh every 3 seconds for more real-time feel
      return () => clearInterval(interval);
    }
  }, [currentSession?.id, currentSession?.status]);

  // Update agent steps when session changes
  useEffect(() => {
    console.log('Session changed effect triggered');
    console.log('Current session:', currentSession);
    if (currentSession?.tasks && currentSession.tasks.length > 0) {
      const latestTask = currentSession.tasks[currentSession.tasks.length - 1];
      console.log('Latest task from effect:', latestTask);
      if (latestTask.steps) {
        console.log('Setting agent steps from effect:', latestTask.steps.length);
        setAgentSteps(latestTask.steps);
      } else {
        console.log('No steps in latest task from effect');
      }
    } else {
      console.log('No tasks in current session from effect');
    }
  }, [currentSession]);

  if (!showLiveBrowser || !currentSession) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <Monitor className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">No active browser session</p>
          <p className="text-sm text-gray-500 mt-2">
            Start a new automation task to see the live browser view
          </p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'stopped':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Live Browser View
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Session: {currentSession.id.slice(0, 8)}...{currentSession.id.slice(-4)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(currentSession.status)}`}>
              {getStatusIcon(currentSession.status)}
              {currentSession.status}
            </div>
            <button
              onClick={() => setShowAgentThoughts(!showAgentThoughts)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                showAgentThoughts 
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Toggle agent thoughts"
            >
              <div className="flex items-center gap-1">
                <Brain className="w-3 h-3" />
                <span className="hidden sm:inline">Thoughts</span>
              </div>
            </button>
            <button
              onClick={refreshSession}
              disabled={isRefreshing}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
              title="Refresh session"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {currentSession.liveUrl && (
              <a
                href={currentSession.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        
        {/* Session Info */}
        <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <span className="font-medium">Started:</span> {new Date(currentSession.startedAt).toLocaleTimeString()}
          </div>
          {currentSession.finishedAt && (
            <div>
              <span className="font-medium">Finished:</span> {new Date(currentSession.finishedAt).toLocaleTimeString()}
            </div>
          )}
          <div>
            <span className="font-medium">Tasks:</span> {currentSession.tasks?.length || 0}
          </div>
          {currentSession.recordUrl && (
            <div>
              <a 
                href={currentSession.recordUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                📹 Recording Available
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Browser View */}
        <div className={showAgentThoughts ? `flex-1 border-r border-gray-200` : 'flex-1'}>
          {currentSession.liveUrl ? (
            <iframe
              src={currentSession.liveUrl}
              className="w-full h-full border-0"
              title="Live Browser View"
              allow="fullscreen"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <div className="animate-pulse">
                  <Monitor className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                </div>
                <p className="text-gray-600 font-medium">Starting browser session...</p>
                <p className="text-sm text-gray-500 mt-2">
                  Live view will appear once the session is active
                </p>
                <div className="mt-4">
                  <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Agent Thoughts Panel */}
        {showAgentThoughts && (
          <>
            {/* Resizer */}
            <div 
              className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize flex-shrink-0 relative group"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = rightPanelWidth;

                const handleMouseMove = (e: MouseEvent) => {
                  const newWidth = startWidth - (e.clientX - startX);
                  setRightPanelWidth(Math.max(250, Math.min(500, newWidth)));
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <div className="absolute inset-y-0 left-0 w-1 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Agent Thoughts Panel */}
            <div 
              className="bg-white overflow-y-auto"
              style={{ width: `${rightPanelWidth}px` }}
            >
              <DebugSteps />
              <AgentThoughts 
                steps={agentSteps} 
                isActive={currentSession.status === 'active'} 
              />
            </div>
          </>
        )}
      </div>

      {/* Task List */}
      {currentSession.tasks && currentSession.tasks.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tasks ({currentSession.tasks.length})</h4>
          <div className="space-y-1">
            {currentSession.tasks.slice(-3).map((task) => (
              <div key={task.id} className="text-xs text-gray-600 flex items-center gap-2">
                {getStatusIcon(task.status)}
                <span className="truncate flex-1">{task.task}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
            ))}
            {currentSession.tasks.length > 3 && (
              <div className="text-xs text-gray-500">
                ... and {currentSession.tasks.length - 3} more tasks
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}