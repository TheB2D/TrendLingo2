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
  const [persistentSteps, setPersistentSteps] = useState<AgentStep[]>([]);

  useEffect(() => {
    console.log('AgentThoughts received steps:', steps);
    console.log('Steps count:', steps.length);
    console.log('Is active:', isActive);
    
    // Always update persistent steps when we receive new steps
    if (steps.length > 0) {
      setPersistentSteps(steps);
      // Auto-expand the latest step when new steps arrive
      setExpandedStep(steps[steps.length - 1].number);
    }
    // Don't clear persistent steps when steps becomes empty - keep showing them!
  }, [steps.length, isActive]);

  // Only show waiting state if we've never had any steps
  if (persistentSteps.length === 0) {
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
        <h3 className="font-semibold text-gray-800">Agent Thoughts</h3>
        {isActive && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </div>
        )}
      </div>

      {persistentSteps.map((step) => (
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
                    Observation
                  </div>
                  <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                    {step.memory}
                  </p>
                </div>
              )}

              {/* Evaluation */}
              {step.evaluationPreviousGoal && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    Evaluation
                  </div>
                  <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg">
                    {step.evaluationPreviousGoal}
                  </p>
                </div>
              )}

              {/* Next Goal */}
              {step.nextGoal && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                    <Target className="w-4 h-4" />
                    Next Goal
                  </div>
                  <p className="text-sm text-gray-700 bg-purple-50 p-3 rounded-lg">
                    {step.nextGoal}
                  </p>
                </div>
              )}

              {/* Actions */}
              {step.actions && step.actions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                    <Zap className="w-4 h-4" />
                    Actions
                  </div>
                  <div className="space-y-1">
                    {step.actions.map((action, idx) => {
                      try {
                        const parsedAction = JSON.parse(action);
                        const actionType = Object.keys(parsedAction)[0];
                        const actionData = parsedAction[actionType];
                        
                        return (
                          <div key={idx} className="text-xs font-mono bg-orange-50 p-2 rounded border-l-2 border-orange-300">
                            <span className="font-semibold text-orange-800">{actionType}:</span>
                            <pre className="text-gray-700 mt-1 whitespace-pre-wrap">
                              {JSON.stringify(actionData, null, 2)}
                            </pre>
                          </div>
                        );
                      } catch {
                        return (
                          <div key={idx} className="text-xs font-mono bg-gray-50 p-2 rounded">
                            {action}
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

      {isActive && persistentSteps.length > 0 && (
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