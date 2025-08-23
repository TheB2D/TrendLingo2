'use client';

import { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Type, Edit3 } from 'lucide-react';

interface TextPromptNodeData {
  text: string;
  nodeNumber: number;
  onTextChange: (nodeId: string, newText: string) => void;
}

export function TextPromptNode({ id, data, selected }: NodeProps<TextPromptNodeData>) {
  const [isEditing, setIsEditing] = useState(!data.text); // Auto-edit if no text
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
      textarea.style.height = Math.max(60, textarea.scrollHeight) + 'px';
    }
  }, [isEditing]);

  const handleSave = () => {
    if (localText.trim()) {
      data.onTextChange(id, localText.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setLocalText(data.text || '');
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.max(60, e.target.scrollHeight) + 'px';
  };

  return (
    <div className={`
      bg-white rounded-lg border-2 shadow-lg min-w-[250px] max-w-[400px]
      ${selected ? 'border-blue-500 shadow-blue-200' : 'border-gray-200'}
      transition-all duration-200 hover:shadow-xl
    `}>
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-5 h-5 !bg-blue-500 border-3 border-white shadow-lg hover:!bg-blue-600 transition-all duration-200"
        style={{ left: -10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-5 h-5 !bg-green-500 border-3 border-white shadow-lg hover:!bg-green-600 transition-all duration-200"
        style={{ right: -10 }}
      />

      {/* Node Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Prompt #{data.nodeNumber}</span>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Node Content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={localText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyPress}
              placeholder="Enter your prompt text here..."
              className="w-full p-2 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ minHeight: '60px' }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!localText.trim()}
                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-[60px]">
            {localText ? (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {localText}
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic">
                Click to add prompt text...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}