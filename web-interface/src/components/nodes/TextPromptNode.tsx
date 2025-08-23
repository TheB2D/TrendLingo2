'use client';

import { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Type, X, GripVertical } from 'lucide-react';

interface TextPromptNodeData {
  text: string;
  onTextChange: (nodeId: string, newText: string) => void;
}

export function TextPromptNode({ id, data, selected }: NodeProps<TextPromptNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(data.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalText(data.text || '');
  }, [data.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleSave = () => {
    data.onTextChange(id, localText);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
    if (e.key === 'Escape') {
      setLocalText(data.text || '');
      setIsEditing(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <div className={`
      bg-white rounded-lg border-2 shadow-lg min-w-[200px] max-w-[300px] 
      ${selected ? 'border-blue-500 shadow-blue-200' : 'border-gray-200'}
      transition-all duration-200 hover:shadow-xl
    `}>
      {/* Handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
        style={{ left: -6 }}
      />

      {/* Node Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg border-b border-gray-100">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
          <Type className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Text Prompt</span>
        </div>
        <div className="text-xs text-gray-500">
          {localText.length} chars
        </div>
      </div>

      {/* Node Content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={localText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyPress}
              placeholder="Enter your prompt text here..."
              className="w-full p-2 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              style={{ minHeight: '60px' }}
            />
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleSave}
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setLocalText(data.text || '');
                  setIsEditing(false);
                }}
                className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <div className="ml-auto text-gray-500">
                Ctrl+Enter to save • Esc to cancel
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="min-h-[60px] p-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded cursor-text hover:bg-gray-100 transition-colors"
          >
            {localText || (
              <span className="text-gray-400 italic">
                Click to add prompt text...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Node Footer */}
      {localText && (
        <div className="px-3 pb-3">
          <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
            💡 This text will be part of the generated prompt
          </div>
        </div>
      )}

      {/* Handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-green-500 border-2 border-white"
        style={{ right: -6 }}
      />
    </div>
  );
}