import { Node, Edge } from 'reactflow';

export interface NodeStrand {
  id: string;
  nodes: Node[];
  rootNodeId: string;
}

export function detectNodeStrands(nodes: Node[], edges: Edge[]): NodeStrand[] {
  if (nodes.length === 0) return [];
  
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const visited = new Set<string>();
  const strands: NodeStrand[] = [];
  
  // Build adjacency list for connected components
  const adjacencyList = new Map<string, Set<string>>();
  nodes.forEach(node => {
    adjacencyList.set(node.id, new Set());
  });
  
  edges.forEach(edge => {
    adjacencyList.get(edge.source)?.add(edge.target);
    adjacencyList.get(edge.target)?.add(edge.source);
  });
  
  // Find connected components using DFS
  const findConnectedComponent = (startNodeId: string): Node[] => {
    const component: Node[] = [];
    const stack = [startNodeId];
    
    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      const node = nodeMap.get(nodeId);
      if (node) {
        component.push(node);
        
        // Add all connected nodes to stack
        const connected = adjacencyList.get(nodeId);
        if (connected) {
          connected.forEach(connectedId => {
            if (!visited.has(connectedId)) {
              stack.push(connectedId);
            }
          });
        }
      }
    }
    
    return component;
  };
  
  // Find all connected components (strands)
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const componentNodes = findConnectedComponent(node.id);
      if (componentNodes.length > 0) {
        // Find root node (node with no incoming edges within this component)
        const componentNodeIds = new Set(componentNodes.map(n => n.id));
        const hasIncomingEdge = new Set(
          edges
            .filter(edge => componentNodeIds.has(edge.target) && componentNodeIds.has(edge.source))
            .map(edge => edge.target)
        );
        
        const rootNode = componentNodes.find(node => !hasIncomingEdge.has(node.id)) || componentNodes[0];
        
        strands.push({
          id: `strand-${strands.length + 1}`,
          nodes: componentNodes,
          rootNodeId: rootNode.id
        });
      }
    }
  });
  
  return strands;
}

export function generatePromptFromStrand(strand: NodeStrand, edges: Edge[]): string {
  const nodeMap = new Map(strand.nodes.map(node => [node.id, node]));
  const visited = new Set<string>();
  const result: string[] = [];
  
  const traverseNode = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (node && node.data.text && node.data.text.trim()) {
      result.push(node.data.text.trim());
    }
    
    // Find and traverse connected nodes within this strand
    const outgoingEdges = edges.filter(edge => 
      edge.source === nodeId && nodeMap.has(edge.target)
    );
    outgoingEdges.forEach(edge => traverseNode(edge.target));
  };
  
  traverseNode(strand.rootNodeId);
  return result.join(' ');
}