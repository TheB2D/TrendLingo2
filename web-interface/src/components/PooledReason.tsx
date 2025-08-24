'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { knowledgeGraphClient } from '@/lib/knowledge-graph-client';
import { 
  Brain, 
  Network, 
  RefreshCw, 
  Info, 
  Layers,
  Database,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';

// Dynamically import ForceGraph3D to avoid SSR issues
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-purple-500 rounded-full"></div>
    </div>
  )
});

interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  color?: string;
  size?: number;
}

interface KnowledgeLink {
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
  color?: string;
  width?: number;
}

interface GraphData {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
}

interface SessionStats {
  totalSessions: number;
  totalFragments: number;
  totalConcepts: number;
}

export function PooledReason() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [sessionStats, setSessionStats] = useState<SessionStats>({ 
    totalSessions: 0, 
    totalFragments: 0, 
    totalConcepts: 0 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const forceRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);

  const nodeColors = {
    ReasonFragment: {
      memory: '#3B82F6',     // Blue
      evaluation: '#10B981', // Green
      goal: '#8B5CF6',       // Purple
      action: '#F59E0B'      // Orange
    },
    Concept: '#EF4444',      // Red
    BrowserSession: '#6B7280', // Gray
    Task: '#14B8A6'          // Teal
  };

  const relationshipColors = {
    CAUSAL: '#EF4444',
    TEMPORAL: '#3B82F6',
    CONCEPTUAL: '#8B5CF6',
    DEPENDENCY: '#F59E0B',
    SIMILARITY: '#10B981',
    CONTRADICTION: '#DC2626',
    CONTAINS_CONCEPT: '#6B7280'
  };

  const getNodeColor = useCallback((node: KnowledgeNode): string => {
    if (node.type === 'ReasonFragment') {
      const fragmentType = node.properties.nodeType || node.properties.type;
      return nodeColors.ReasonFragment[fragmentType as keyof typeof nodeColors.ReasonFragment] || nodeColors.ReasonFragment.memory;
    }
    return nodeColors[node.type as keyof typeof nodeColors] || '#6B7280';
  }, []);

  const getNodeSize = useCallback((node: KnowledgeNode): number => {
    if (node.type === 'Concept') {
      return 8; // Concepts are larger
    }
    if (node.type === 'ReasonFragment') {
      return 6; // Fragments are medium
    }
    return 4; // Other nodes are smaller
  }, []);

  const loadKnowledgeGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await knowledgeGraphClient.getPooledKnowledgeGraph();
      
      const processedNodes: KnowledgeNode[] = result.nodes.map(node => ({
        ...node,
        color: getNodeColor(node),
        size: getNodeSize(node)
      }));

      const processedLinks: KnowledgeLink[] = result.relationships.map(rel => ({
        source: rel.from,
        target: rel.to,
        type: rel.type,
        properties: rel.properties,
        color: relationshipColors[rel.type as keyof typeof relationshipColors] || '#6B7280',
        width: (rel.properties.strength || 1) * 2
      }));

      setGraphData({
        nodes: processedNodes,
        links: processedLinks
      });
      
      setSessionStats(result.sessionStats);
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
      setError('Failed to load knowledge graph. Please check your Neo4j connection.');
    } finally {
      setIsLoading(false);
    }
  }, [getNodeColor, getNodeSize]);

  useEffect(() => {
    loadKnowledgeGraph();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadKnowledgeGraph, 30000);
    return () => clearInterval(interval);
  }, [loadKnowledgeGraph]);

  // Handle container resizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          setDimensions({ width: offsetWidth, height: offsetHeight });
        }
      }
    };

    // Small delay to ensure the container is properly rendered
    const timeout = setTimeout(updateDimensions, 100);
    
    window.addEventListener('resize', updateDimensions);
    
    // Use ResizeObserver if available for more accurate container resize detection
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateDimensions);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);



  const getFilteredData = (): GraphData => {
    if (filterType === 'all') {
      return graphData;
    }

    const filteredNodes = graphData.nodes.filter(node => {
      if (filterType === 'concepts') return node.type === 'Concept';
      if (filterType === 'fragments') return node.type === 'ReasonFragment';
      if (node.type === 'ReasonFragment') {
        return node.properties.nodeType === filterType || node.properties.type === filterType;
      }
      return false;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graphData.links.filter(link => 
      nodeIds.has(link.source as string) && nodeIds.has(link.target as string)
    );

    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  };

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    
    // Focus on the node in 3D
    if (forceRef.current) {
      // Aim at node from outside it
      const distance = 40;
      const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

      const newPos = node.x || node.y || node.z
        ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
        : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

      forceRef.current.cameraPosition(
        newPos, // new position
        node, // lookAt ({ x, y, z })
        3000  // ms transition duration
      );
    }
  };

  const resetView = () => {
    if (forceRef.current) {
      forceRef.current.zoomToFit(1000);
    }
  };

  const filteredData = getFilteredData();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-600 p-8">
        <Database className="w-16 h-16 mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
        <p className="text-sm text-center mb-4">{error}</p>
        <button
          onClick={loadKnowledgeGraph}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">Pooled Reason</h2>
            </div>
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Cross-session Knowledge Graph
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={resetView}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </button>
            
            <button
              onClick={loadKnowledgeGraph}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Network className="w-4 h-4" />
            <span>{sessionStats.totalSessions} Sessions</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            <span>{sessionStats.totalFragments} Fragments</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-4 h-4" />
            <span>{sessionStats.totalConcepts} Concepts</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{filteredData.links.length} Relationships</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          {['all', 'concepts', 'fragments', 'memory', 'evaluation', 'goal', 'action'].map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filterType === filter
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Graph Container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ minHeight: '400px' }}
      >
        {filteredData.nodes.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Network className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Knowledge Graph Data</p>
            <p className="text-sm text-center">
              Run some browser automation tasks to populate the knowledge graph with reasoning traces.
            </p>
          </div>
        ) : dimensions.width > 0 && dimensions.height > 0 ? (
          <div className="w-full h-full">
            <ForceGraph3D
              ref={forceRef}
              graphData={filteredData}
              nodeLabel={(node: any) => `
                <div style="background: white; padding: 8px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); max-width: 300px;">
                  <div style="font-weight: bold; color: #374151; margin-bottom: 4px;">
                    ${node.type === 'Concept' ? 'Concept' : node.properties.nodeType || node.type}
                  </div>
                  <div style="color: #6B7280; font-size: 12px; line-height: 1.4;">
                    ${node.label}
                  </div>
                  ${node.properties.stepNumber ? `<div style="color: #9CA3AF; font-size: 11px; margin-top: 4px;">Step ${node.properties.stepNumber}</div>` : ''}
                </div>
              `}
              linkLabel={(link: any) => `
                <div style="background: white; padding: 6px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                  <div style="font-weight: bold; color: #374151; font-size: 12px;">
                    ${link.type}
                  </div>
                  ${link.properties.strength ? `<div style="color: #6B7280; font-size: 11px;">Strength: ${(link.properties.strength * 100).toFixed(0)}%</div>` : ''}
                </div>
              `}
              nodeColor={(node: any) => node.color}
              nodeVal={(node: any) => node.size}
              linkColor={(link: any) => link.color}
              linkWidth={(link: any) => link.width}
              onNodeClick={handleNodeClick}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              enableNavigationControls={true}
              enableNodeDrag={true}
              cooldownTime={5000}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              backgroundColor="rgba(0,0,0,0.05)"
              showNavInfo={false}
              width={dimensions.width}
              height={dimensions.height}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-purple-500 rounded-full"></div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-purple-500 rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Loading knowledge graph...</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="absolute top-20 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Node Details</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
              <p className="text-sm text-gray-800">{selectedNode.type}</p>
            </div>
            
            {selectedNode.properties.nodeType && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subtype</label>
                <p className="text-sm text-gray-800">{selectedNode.properties.nodeType}</p>
              </div>
            )}
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Label</label>
              <p className="text-sm text-gray-800">{selectedNode.label}</p>
            </div>
            
            {selectedNode.properties.text && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Text</label>
                <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded text-wrap break-words">
                  {selectedNode.properties.text}
                </p>
              </div>
            )}
            
            {selectedNode.properties.stepNumber && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Step Number</label>
                <p className="text-sm text-gray-800">{selectedNode.properties.stepNumber}</p>
              </div>
            )}
            
            {selectedNode.properties.timestamp && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Timestamp</label>
                <p className="text-sm text-gray-800">
                  {new Date(selectedNode.properties.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <div className="text-xs font-medium text-gray-700 mb-2">Node Types</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Memory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Evaluation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Goal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Action</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Concept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
