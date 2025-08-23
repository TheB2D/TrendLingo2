'use client';

import { useState, useEffect } from 'react';
import { Brain, Eye, Target, Zap, Clock, CheckCircle } from 'lucide-react';
import { AgentStep } from '@/types/browser-use';

interface AgentThoughtsProps {
  steps: AgentStep[];
  isActive: boolean;
}

export function AgentThoughts({ steps, isActive }: AgentThoughtsProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  useEffect(() => {
    console.log('AgentThoughts received steps:', steps);
    console.log('Steps count:', steps.length);
    console.log('Is active:', isActive);
    
    // Auto-expand the latest step when new steps arrive
    if (steps.length > 0) {
      setExpandedStep(steps[steps.length - 1].number);
    }
  }, [steps.length]);

  if (steps.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium">Agent Thoughts</p>
        <p className="text-xs mt-1">
          {isActive 
            ? "Waiting for agent reasoning..." 
            : "Agent thoughts will appear here during automation"
          }
        </p>
        {isActive && (
          <div className="mt-3">
            <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-purple-500 rounded-full mx-auto"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-800">Detailed Agent Reasoning</h3>
        {isActive && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live Analysis
          </div>
        )}
      </div>
      
      {/* Workflow Progress Summary */}
      {steps.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg border border-purple-200 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-purple-800 text-sm">Workflow Progress</h4>
              <p className="text-xs text-purple-600">
                {steps.length} reasoning steps completed
                {isActive && " • Agent actively processing..."}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-purple-700">{steps.length}</div>
              <div className="text-xs text-purple-600">Steps</div>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-1">
              {steps.slice(-5).map((step, idx) => (
                <div 
                  key={step.number}
                  className="w-3 h-3 bg-purple-400 rounded-full flex-shrink-0"
                  title={`Step ${step.number}`}
                />
              ))}
              {steps.length > 5 && (
                <span className="text-xs text-purple-500 ml-1">+{steps.length - 5} more</span>
              )}
            </div>
          </div>
        </div>
      )}

      {steps.map((step) => (
        <div 
          key={step.number}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <div 
            className="p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setExpandedStep(expandedStep === step.number ? null : step.number)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                  {step.number}
                </div>
                <span className="font-medium text-sm text-gray-700">
                  Step {step.number}
                </span>
                {step.url && (
                  <span className="text-xs text-gray-500 truncate max-w-48">
                    {step.url}
                  </span>
                )}
              </div>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
          </div>

          {expandedStep === step.number && (
            <div className="p-4 space-y-4 bg-white">
              {/* Memory/Observation */}
              {step.memory && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                    <Eye className="w-4 h-4" />
                    Detailed Observation & Analysis
                  </div>
                  <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg space-y-2">
                    <p className="font-medium text-blue-800">Current State:</p>
                    <p className="whitespace-pre-wrap">{step.memory}</p>
                    {step.url && (
                      <div className="pt-2 border-t border-blue-200">
                        <p className="font-medium text-blue-800">Page URL:</p>
                        <code className="text-xs bg-white px-2 py-1 rounded border">
                          {step.url}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Evaluation */}
              {step.evaluationPreviousGoal && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    Strategic Evaluation & Progress Assessment
                  </div>
                  <div className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg space-y-2">
                    <p className="font-medium text-green-800">Previous Goal Assessment:</p>
                    <p className="whitespace-pre-wrap">{step.evaluationPreviousGoal}</p>
                    <div className="pt-2 border-t border-green-200">
                      <p className="font-medium text-green-800">Step {step.number} Status:</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-700">Completed Successfully</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Goal */}
              {step.nextGoal && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                    <Target className="w-4 h-4" />
                    Strategic Planning & Next Objective
                  </div>
                  <div className="text-sm text-gray-700 bg-purple-50 p-3 rounded-lg space-y-2">
                    <p className="font-medium text-purple-800">Reasoning & Next Steps:</p>
                    <p className="whitespace-pre-wrap">{step.nextGoal}</p>
                    <div className="pt-2 border-t border-purple-200">
                      <p className="font-medium text-purple-800">Step Sequence:</p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                          {step.number}
                        </div>
                        <span className="text-xs text-purple-600">→</span>
                        <div className="w-6 h-6 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                          {step.number + 1}
                        </div>
                        <span className="text-xs text-purple-600">Current → Next</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {step.actions && step.actions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                    <Zap className="w-4 h-4" />
                    Executed Actions & Technical Details ({step.actions.length})
                  </div>
                  <div className="space-y-2">
                    {step.actions.map((action, idx) => {
                      try {
                        const parsedAction = JSON.parse(action);
                        const actionType = Object.keys(parsedAction)[0];
                        const actionData = parsedAction[actionType];
                        
                        return (
                          <div key={idx} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </div>
                              <span className="font-semibold text-orange-800 text-sm">
                                {actionType.charAt(0).toUpperCase() + actionType.slice(1)} Action
                              </span>
                            </div>
                            <div className="text-xs font-mono bg-white p-2 rounded border">
                              <div className="text-orange-700 font-semibold mb-1">Action Type:</div>
                              <div className="text-gray-600 mb-2">{actionType}</div>
                              <div className="text-orange-700 font-semibold mb-1">Parameters:</div>
                              <pre className="text-gray-700 whitespace-pre-wrap">
                                {JSON.stringify(actionData, null, 2)}
                              </pre>
                            </div>
                          </div>
                        );
                      } catch {
                        return (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </div>
                              <span className="font-semibold text-gray-700 text-sm">Raw Action</span>
                            </div>
                            <div className="text-xs font-mono bg-white p-2 rounded border">
                              {action}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}

              {/* Screenshot */}
              {step.screenshotUrl && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Clock className="w-4 h-4" />
                    Screenshot
                  </div>
                  <img 
                    src={step.screenshotUrl} 
                    alt={`Step ${step.number} screenshot`}
                    className="max-w-full h-auto rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {isActive && steps.length > 0 && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            Agent is thinking...
          </div>
        </div>
      )}
    </div>
  );
}