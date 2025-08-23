'use client';

import { useAppStore } from '@/lib/store';

export function DebugSteps() {
  const { currentSession } = useAppStore();

  if (!currentSession) {
    return <div className="p-4 text-red-500">No current session</div>;
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-bold text-yellow-800 mb-2">🐛 Debug Info</h3>
      <div className="text-sm space-y-1">
        <div><strong>Session ID:</strong> {currentSession.id}</div>
        <div><strong>Status:</strong> {currentSession.status}</div>
        <div><strong>Tasks Count:</strong> {currentSession.tasks?.length || 0}</div>
        {currentSession.tasks && currentSession.tasks.length > 0 && (
          <div>
            <strong>Latest Task:</strong>
            <div className="ml-4 mt-1">
              <div><strong>ID:</strong> {currentSession.tasks[currentSession.tasks.length - 1].id}</div>
              <div><strong>Status:</strong> {currentSession.tasks[currentSession.tasks.length - 1].status}</div>
              <div><strong>Steps:</strong> {currentSession.tasks[currentSession.tasks.length - 1].steps?.length || 0}</div>
              {currentSession.tasks[currentSession.tasks.length - 1].steps && (
                <div className="mt-2">
                  <strong>Step Details:</strong>
                  <pre className="text-xs bg-white p-2 rounded border max-h-40 overflow-y-auto">
                    {JSON.stringify(currentSession.tasks[currentSession.tasks.length - 1].steps, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}