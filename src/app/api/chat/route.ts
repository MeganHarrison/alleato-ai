import { NextRequest, NextResponse } from 'next/server';

const RAG_WORKER_URL = process.env.NEXT_PUBLIC_RAG_WORKER_URL || 'https://fireflies-rag-worker.megan-d14.workers.dev';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { message: string; projectId?: number };
    const { message, projectId } = body;
    
    // Use vector search for AI-powered responses
    const searchResponse = await fetch(`${RAG_WORKER_URL}/vector-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: message, 
        limit: 5 
      }),
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({ error: searchResponse.statusText }));
      console.error('RAG worker error:', errorData);
      
      // Fallback to regular search if vector search fails
      const fallbackResponse = await fetch(`${RAG_WORKER_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: message, 
          limit: 5 
        }),
      });
      
      if (!fallbackResponse.ok) {
        return NextResponse.json(
          { response: 'Sorry, I encountered an error searching the meeting database.' },
          { status: 500 }
        );
      }
      
      const fallbackData = await fallbackResponse.json();
      const fallbackResults = fallbackData.results || [];
      
      if (fallbackResults.length === 0) {
        return NextResponse.json({
          response: `I couldn't find any relevant information about "${message}" in the meeting transcripts.`
        });
      }
      
      const response = `Based on the meeting transcripts, here's what I found about "${message}":\n\n` +
        fallbackResults.slice(0, 3).map((r: any) => 
          `• From "${r.meeting?.title || 'Unknown Meeting'}" (${new Date(r.meeting?.date).toLocaleDateString()}): ${r.chunk?.content?.substring(0, 200)}...`
        ).join('\n\n');
      
      return NextResponse.json({ response });
    }

    const data = await searchResponse.json();
    const results = data.results || [];
    
    if (results.length === 0) {
      return NextResponse.json({
        response: `I couldn't find any relevant information about "${message}" in the meeting transcripts. The system has access to 827 meetings - try asking about specific projects, clients, or topics discussed in meetings.`
      });
    }
    
    // Format the response from search results
    const response = `Based on AI analysis of the meeting transcripts, here's what I found:\n\n` +
      results.slice(0, 3).map((r: any, i: number) => 
        `${i + 1}. From "${r.meeting?.title || 'Unknown Meeting'}" (${r.meeting?.date ? new Date(r.meeting.date).toLocaleDateString() : 'Date unknown'}):\n   ${r.chunk?.content?.substring(0, 250) || 'No content available'}...`
      ).join('\n\n') +
      `\n\nFound ${results.length} relevant sections across the meeting database.`;
    
    return NextResponse.json({ response });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { response: 'Sorry, I encountered an error processing your request. Please try again.' },
      { status: 500 }
    );
  }
}