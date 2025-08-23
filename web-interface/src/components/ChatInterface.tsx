'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Play, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getBrowserService } from '@/lib/browser-use-service';

const browserService = getBrowserService();

export function ChatInterface() {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    addMessage,
    setLoading,
    setCurrentSession,
    addSession,
    updateSession,
  } = useAppStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
    });

    setLoading(true);

    try {
      // Add assistant thinking message
      const thinkingMessageId = crypto.randomUUID();
      addMessage({
        role: 'assistant',
        content: '🤖 Creating browser automation task...',
      });

      // Create browser task
      const { session, task } = await browserService.createTaskAndGetSession(userMessage);
      
      setCurrentSession(session);
      addSession(session);

      // Start streaming the task progress to get real-time steps
      setTimeout(async () => {
        try {
          await browserService.streamTaskProgress(task.id, (streamData) => {
            console.log('Stream data received:', streamData);
            
            // Update session with new step data if available
            console.log('Processing stream data for steps update:', streamData.data);
            console.log('Does streamData.data exist?', !!streamData.data);
            console.log('Does streamData.data.steps exist?', !!streamData.data?.steps);
            console.log('streamData.data.steps value:', streamData.data?.steps);
            console.log('streamData.data.steps is array?', Array.isArray(streamData.data?.steps));
            
            if (streamData.data && streamData.data.steps) {
              const updatedTasks = session.tasks ? [...session.tasks] : [task];
              const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
              
              console.log('Found task at index:', taskIndex);
              console.log('Updating task with steps:', streamData.data.steps);
              
              if (taskIndex !== -1) {
                updatedTasks[taskIndex] = {
                  ...updatedTasks[taskIndex],
                  steps: streamData.data.steps,
                  status: streamData.data.status || updatedTasks[taskIndex].status
                };
              }
              
              console.log('About to update session with updatedTasks:', updatedTasks);
              updateSession(session.id, { tasks: updatedTasks });
            }
          });
        } catch (error) {
          console.error('Streaming failed:', error);
        }
      }, 1000); // Start streaming after 1 second

      // Update assistant message with session info
      addMessage({
        role: 'assistant',
        content: `✅ Browser automation started!

**Task:** ${task.task}
**Session ID:** ${session.id.slice(0, 8)}...
**Status:** ${session.status}

${session.liveUrl 
  ? `🔴 **Live View Available** - You can watch the automation in real-time!` 
  : 'Live view will be available once the session starts.'
}`,
        sessionId: session.id,
        taskId: task.id,
      });

    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `❌ Failed to create browser automation task. 

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Please check your API key configuration and try again.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleViewLive = (sessionId: string) => {
    const { selectSession } = useAppStore.getState();
    selectSession(sessionId);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">
          BrowSee Assistant
        </h2>
        <p className="text-sm text-gray-600">
          Tell me what you want to automate in your browser
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Welcome to BrowSee</p>
            <p className="text-sm mb-4">
              Start by describing what you want to automate. For example:
            </p>
            <div className="space-y-2 text-left bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
              <p className="text-sm">• "Navigate to Google and search for 'marketing trends'"</p>
              <p className="text-sm">• "Take a screenshot of example.com"</p>
              <p className="text-sm">• "Fill out a contact form on a website"</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white ml-3'
                    : 'bg-gray-100 text-gray-600 mr-3'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
                {message.sessionId && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => handleViewLive(message.sessionId!)}
                      className="text-xs bg-green-500 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-green-600 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      View Live
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              <span className="text-sm text-gray-600">Processing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to automate..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}