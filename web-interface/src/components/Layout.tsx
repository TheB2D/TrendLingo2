'use client';

import { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { LiveBrowserView } from './LiveBrowserView';
import { WorkflowInterface } from './WorkflowInterface';
import { useAppStore } from '@/lib/store';
import { 
  Monitor, 
  MessageSquare, 
  Settings, 
  History, 
  Trash2,
  Bot,
  GitBranch
} from 'lucide-react';

export function Layout() {
  const [leftPanelWidth, setLeftPanelWidth] = useState(420);
  const { 
    showLiveBrowser, 
    toggleLiveBrowser, 
    currentSession, 
    clearChat,
    messages,
    isWorkflowMode,
    toggleWorkflowMode
  } = useAppStore();

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat?')) {
      clearChat();
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                AI Browser Automation
              </h1>
              <p className="text-sm text-gray-600">
                Automate web tasks with natural language
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleWorkflowMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isWorkflowMode 
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isWorkflowMode ? 'Workflow' : 'Chat'}
              </span>
            </button>
            
            {messages.length > 0 && !isWorkflowMode && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            )}
            
            {currentSession && (
              <button
                onClick={toggleLiveBrowser}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showLiveBrowser 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {showLiveBrowser ? 'Hide' : 'Show'} Live Browser
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Panel */}
        <div 
          className="flex-shrink-0 border-r border-gray-200 min-h-full"
          style={{ width: `${leftPanelWidth}px` }}
        >
          {isWorkflowMode ? <WorkflowInterface /> : <ChatInterface />}
        </div>

        {/* Resizer */}
        <div 
          className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize flex-shrink-0 relative group"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = leftPanelWidth;

            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = startWidth + (e.clientX - startX);
              setLeftPanelWidth(Math.max(320, Math.min(800, newWidth)));
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-h-full">
          {showLiveBrowser ? (
            <LiveBrowserView />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md mx-auto p-8">
                <MessageSquare className="w-20 h-20 mx-auto text-gray-400 mb-6" />
                <h3 className="text-xl font-medium text-gray-800 mb-3">
                  Welcome to AI Browser Automation
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Start a conversation in the chat panel to create browser automation tasks. 
                  The live browser view will appear here once a session is active.
                </p>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200 text-left">
                  <h4 className="font-medium text-gray-800 mb-2">Try these examples:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• "Navigate to Google and search for 'AI automation'"</li>
                    <li>• "Take a screenshot of example.com"</li>
                    <li>• "Go to news.ycombinator.com and get the top stories"</li>
                    <li>• "Fill out a contact form on a website"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {currentSession && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-600 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                currentSession.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span>Session: {currentSession.id.slice(0, 8)}...</span>
            </div>
            <div>
              Status: {currentSession.status}
            </div>
            {currentSession.tasks && (
              <div>
                Tasks: {currentSession.tasks.length}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {currentSession.liveUrl && (
              <a
                href={currentSession.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                Open Live View
              </a>
            )}
            {currentSession.recordUrl && (
              <a
                href={currentSession.recordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-700"
              >
                View Recording
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}