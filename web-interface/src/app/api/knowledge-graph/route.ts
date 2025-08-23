import { NextRequest, NextResponse } from 'next/server';
import { knowledgeGraphService } from '@/lib/knowledge-graph-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const sessionId = searchParams.get('sessionId');

    if (type === 'pooled') {
      const graph = await knowledgeGraphService.getPooledKnowledgeGraph();
      return NextResponse.json(graph);
    } else if (type === 'session' && sessionId) {
      const graph = await knowledgeGraphService.getSessionKnowledgeGraph(sessionId);
      return NextResponse.json({ nodes: graph.nodes, relationships: graph.relationships });
    } else {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }
  } catch (error) {
    console.error('Knowledge graph API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge graph data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'process-steps') {
      const { steps, sessionId, taskId } = data;
      await knowledgeGraphService.processAgentSteps(steps, sessionId, taskId);
      return NextResponse.json({ success: true });
    } else if (action === 'initialize') {
      await knowledgeGraphService.initialize();
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Knowledge graph API error:', error);
    return NextResponse.json(
      { error: 'Failed to process knowledge graph action' },
      { status: 500 }
    );
  }
}
