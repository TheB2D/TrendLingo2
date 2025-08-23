'use client';

import { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { LiveBrowserView } from './LiveBrowserView';
import { WorkflowInterface } from './WorkflowInterface';
import { AgentThoughts } from './AgentThoughts';
import { DebugSteps } from './DebugSteps';
import { useAppStore } from '@/lib/store';
import { GoogleGenAI } from '@google/genai';
import { 
  Monitor, 
  MessageSquare, 
  Settings, 
  History, 
  Trash2,
  Bot,
  GitBranch,
  Brain,
  Sparkles
} from 'lucide-react';

export function Layout() {
  const [leftPanelWidth, setLeftPanelWidth] = useState(420);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
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

  const handleAIPrompt = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsAILoading(true);
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: aiPrompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        }
      });
      
      setAiResponse(response.text);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setAiResponse('Error: Failed to get response from Gemini AI');
    } finally {
      setIsAILoading(false);
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
                BrowSee
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
            
            <button
              onClick={() => setShowAIPrompt(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transform hover:scale-105 shadow-lg hover:shadow-xl"
              style={{
                background: 'linear-gradient(45deg, #8b5cf6, #ec4899, #f97316)',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(236, 72, 153, 0.2), 0 0 60px rgba(249, 115, 22, 0.1)'
              }}
            >
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 opacity-75 blur-sm"></div>
              <div className="relative flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="hidden sm:inline font-semibold">AI Mode</span>
              </div>
            </button>

            {currentSession && (
              <>
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showReasoning 
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {showReasoning ? 'Hide' : 'Show'} Reasoning
                  </span>
                </button>
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
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel */}
        <div 
          className="flex-shrink-0 border-r border-gray-200 min-h-full overflow-hidden"
          style={{ 
            width: `${leftPanelWidth}px`,
            minWidth: `${leftPanelWidth}px`,
            maxWidth: `${leftPanelWidth}px`
          }}
        >
          {showReasoning && currentSession ? (
            <div className="h-full flex flex-col bg-white">
              {/* Reasoning Header */}
              <div className="p-4 border-b border-gray-200 bg-purple-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Agent Reasoning & Thoughts
                  </h3>
                  <button
                    onClick={() => setShowReasoning(false)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    Back to Chat
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Real-time analysis of the agent's decision-making process
                </p>
              </div>
              
              {/* Reasoning Content */}
              <div className="flex-1 overflow-y-auto">
                <DebugSteps />
                <AgentThoughts 
                  steps={currentSession.tasks?.[currentSession.tasks.length - 1]?.steps || []} 
                  isActive={currentSession.status === 'active'} 
                />
              </div>
            </div>
          ) : (
            isWorkflowMode ? <WorkflowInterface /> : <ChatInterface />
          )}
        </div>

        {/* Resizer */}
        <div 
          className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize flex-shrink-0 relative group select-none"
          style={{ zIndex: 10 }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const startX = e.clientX;
            const startWidth = leftPanelWidth;
            
            // Add a class to prevent text selection during resize
            document.body.classList.add('select-none');
            document.body.style.cursor = 'col-resize';

            const handleMouseMove = (e: MouseEvent) => {
              e.preventDefault();
              const deltaX = e.clientX - startX;
              const newWidth = startWidth + deltaX;
              const clampedWidth = Math.max(280, Math.min(1000, newWidth));
              setLeftPanelWidth(clampedWidth);
            };

            const handleMouseUp = (e: MouseEvent) => {
              e.preventDefault();
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
              
              // Remove the cursor and selection styles
              document.body.classList.remove('select-none');
              document.body.style.cursor = '';
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
                  Welcome to BrowSee
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

      {/* AI Prompt Modal */}
      {showAIPrompt && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Mode - Ask Gemini
              </h2>
              <button
                onClick={() => {
                  setShowAIPrompt(false);
                  setAiPrompt('');
                  setAiResponse('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your prompt:
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask Gemini anything..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleAIPrompt}
                  disabled={!aiPrompt.trim() || isAILoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isAILoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Ask Gemini
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setShowAIPrompt(false);
                    setAiPrompt('');
                    setAiResponse('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
              
              {aiResponse && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gemini's response:
                  </label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">{aiResponse}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}