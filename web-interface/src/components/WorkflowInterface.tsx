'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  ReactFlow, 
  Node, 
  addEdge, 
  Connection, 
  useNodesState, 
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Play, Bot, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getBrowserService } from '@/lib/browser-use-service';
import { TextPromptNode } from './nodes/TextPromptNode';
import { detectNodeStrands, generatePromptFromStrand } from '@/lib/workflow-utils';

const nodeTypes = {
  textPrompt: TextPromptNode,
};

const browserService = getBrowserService();

function WorkflowInterfaceInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { 
    addMessage, 
    setLoading, 
    setCurrentSession, 
    addSession,
    updateSession,
    workflowNodes,
    workflowEdges,
    updateWorkflow,
    setCurrentStrands,
    setStrandSession,
    updateStrandSession,
    setShowMultipleBrowsers
  } = useAppStore();

  // Apply AI-generated workflows when they come from the store
  useEffect(() => {
    if (workflowNodes.length > 0 && JSON.stringify(workflowNodes) !== JSON.stringify(nodes)) {
      // Rehydrate AI-generated nodes with proper onTextChange functions
      const rehydratedNodes = workflowNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onTextChange: (nodeId: string, newText: string) => {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === nodeId
                  ? { ...n, data: { ...n.data, text: newText } }
                  : n
              )
            );
          }
        }
      }));
      
      setNodes(rehydratedNodes);
      setEdges(workflowEdges);
      
      // Reset viewport to prevent off-center issues
      setTimeout(() => {
        // Reset the viewport to default position and zoom
        const reactFlowInstance = document.querySelector('.react-flow__viewport');
        if (reactFlowInstance) {
          (reactFlowInstance as HTMLElement).style.transform = 'translate(0px, 0px) scale(1)';
        }
      }, 100);
    }
  }, [workflowNodes, workflowEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: {
        type: 'arrowclosed',
        color: '#3b82f6',
      }
    }, eds)),
    [setEdges]
  );

  const getNextNodeNumber = useCallback(() => {
    const textNodes = nodes.filter(node => node.type === 'textPrompt');
    return textNodes.length + 1;
  }, [nodes]);

  const addTextNode = useCallback(() => {
    const newNode: Node = {
      id: `text-${Date.now()}`,
      type: 'textPrompt',
      position: { 
        x: 150 + Math.random() * 300, 
        y: 150 + Math.random() * 200 
      },
      data: { 
        text: '',
        nodeNumber: getNextNodeNumber(),
        onTextChange: (nodeId: string, newText: string) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, text: newText } }
                : node
            )
          );
        }
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes, getNextNodeNumber]);

  const generatePromptFromNodes = useCallback(() => {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const visited = new Set();
    const result: string[] = [];
    
    // Find root nodes (nodes with no incoming edges)
    const hasIncomingEdge = new Set(edges.map(edge => edge.target));
    const rootNodes = nodes.filter(node => !hasIncomingEdge.has(node.id));
    
    const traverseNode = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = nodeMap.get(nodeId);
      if (node && node.data.text && node.data.text.trim()) {
        result.push(node.data.text.trim());
      }
      
      // Find and traverse connected nodes
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      outgoingEdges.forEach(edge => traverseNode(edge.target));
    };
    
    // If no root nodes, start from the first node
    if (rootNodes.length === 0 && nodes.length > 0) {
      traverseNode(nodes[0].id);
    } else {
      rootNodes.forEach(node => traverseNode(node.id));
    }
    
    return result.join(' ');
  }, [nodes, edges]);

  const runWorkflow = useCallback(async () => {
    // Detect strands in current workflow
    const strands = detectNodeStrands(nodes, edges);
    
    if (strands.length === 0) {
      alert('Please add some nodes to your workflow before running.');
      return;
    }

    // Check if any strand has text
    const strandsWithText = strands.filter(strand => 
      generatePromptFromStrand(strand, edges).trim().length > 0
    );
    
    if (strandsWithText.length === 0) {
      alert('Please add some text to your nodes before running the workflow.');
      return;
    }

    setIsRunning(true);
    setLoading(true);

    try {
      // Update current strands in store
      setCurrentStrands(strands);
      
      // Show multiple browser view if we have multiple strands
      if (strands.length > 1) {
        setShowMultipleBrowsers(true);
      }

      // Add workflow message
      addMessage({
        role: 'user',
        content: `🔄 **Multi-Strand Workflow Executed**\n\n**Detected ${strands.length} strand${strands.length !== 1 ? 's' : ''}:**\n${strands.map((strand, i) => `${i + 1}. ${strand.id}: ${generatePromptFromStrand(strand, edges).substring(0, 100)}...`).join('\n')}`,
      });

      // Add assistant thinking message
      addMessage({
        role: 'assistant',
        content: `🤖 Creating ${strands.length} browser automation instance${strands.length !== 1 ? 's' : ''} from workflow strands...`,
      });

      // Create sessions for each strand
      const sessionPromises = strandsWithText.map(async (strand) => {
        const prompt = generatePromptFromStrand(strand, edges);
        const { session, task } = await browserService.createTaskAndGetSession(prompt);
        
        // Store strand session
        setStrandSession(strand.id, session);
        addSession(session);

        // Start streaming for this strand
        setTimeout(async () => {
          try {
            await browserService.streamTaskProgress(task.id, (streamData) => {
              console.log(`Strand ${strand.id} stream data:`, streamData);
              
              if (streamData.data && streamData.data.steps) {
                const updatedTasks = session.tasks ? [...session.tasks] : [task];
                const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
                
                if (taskIndex !== -1) {
                  updatedTasks[taskIndex] = {
                    ...updatedTasks[taskIndex],
                    steps: streamData.data.steps,
                    status: streamData.data.status || updatedTasks[taskIndex].status
                  };
                }
                
                updateStrandSession(strand.id, { tasks: updatedTasks });
              }
            });
          } catch (error) {
            console.error(`Strand ${strand.id} streaming failed:`, error);
          }
        }, 1000);

        return { strand, session, task };
      });

      const results = await Promise.all(sessionPromises);

      // Set the first session as current for compatibility
      if (results.length > 0) {
        setCurrentSession(results[0].session);
      }

      // Update assistant message with results
      addMessage({
        role: 'assistant',
        content: `✅ Multi-strand workflow automation started!

**Created ${results.length} browser instance${results.length !== 1 ? 's' : ''}:**
${results.map(({ strand, session }, i) => `
${i + 1}. **${strand.id}**
   - Session: ${session.id.slice(0, 8)}...
   - Status: ${session.status}
   - Prompt: ${generatePromptFromStrand(strand, edges).substring(0, 80)}...
`).join('')}

${results.length > 1 
  ? `🔴 **Multiple Live Views Available** - Switch to grid view to see all instances!` 
  : '🔴 **Live View Available** - You can watch the automation in real-time!'
}`,
        sessionId: results[0]?.session.id,
        taskId: results[0]?.task.id,
      });

    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `❌ Failed to execute multi-strand workflow automation. 

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Please check your workflow nodes and try again.`,
      });
    } finally {
      setIsRunning(false);
      setLoading(false);
    }
  }, [nodes, edges, addMessage, setLoading, setCurrentSession, addSession, setCurrentStrands, setStrandSession, updateStrandSession, setShowMultipleBrowsers]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-purple-50">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600" />
          Workflow Designer
        </h2>
        <p className="text-sm text-gray-600">
          Create nodes, connect them, and run automated browser workflows
        </p>
      </div>

      {/* Toolbar */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={addTextNode}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Text Node
          </button>
          
          <button
            onClick={runWorkflow}
            disabled={isRunning || nodes.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Running...' : 'Run Workflow'}
          </button>
          
          <div className="ml-auto text-xs text-gray-500">
            Nodes: {nodes.length} | Connections: {edges.length}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          className="bg-gray-50"
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.5}
          maxZoom={2}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
          }}
        >
          <Controls position="top-left" />
          <MiniMap 
            position="bottom-right" 
            className="bg-white border border-gray-200"
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1} 
            color="#e5e7eb"
          />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
            <div className="text-center max-w-md mx-auto p-8">
              <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Start Building Your Workflow
              </h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Click "Add Text Node" to create your first prompt node. Connect nodes together 
                to create a sequence, then click "Run Workflow" to automate your browser tasks.
              </p>
              <button
                onClick={addTextNode}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Node
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkflowInterface() {
  return <WorkflowInterfaceInner />;
}