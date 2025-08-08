import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request: NextRequest) {
  try {
    // Get Cloudflare context
    const { env } = await getCloudflareContext({ async: true });
    
    // Validate environment variables first
    if (!env.CLOUDFLARE_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID === 'your-account-id-here' ||
        !env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_TOKEN === 'your-api-token-here') {
      console.error('Missing or invalid Cloudflare credentials');
      return NextResponse.json({ 
        response: 'Configuration error: Please set your CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the .env.local file.' 
      }, { status: 200 });
    }
    
    const body = await request.json() as { message: string };
    const { message } = body;
    
    // Call Cloudflare AutoRAG API
    const autoragUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/autorag/rags/alleato-docs/ai-search`;
    
    console.log('Calling AutoRAG API:', autoragUrl);
    
    const response = await fetch(autoragUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: message,
        query_rewrite: true,
        topic_modeling: true,
        limit: 5,
        chat_history: []
      }),
    });

    console.log('AutoRAG response status:', response.status);
    console.log('AutoRAG response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AutoRAG API error:', errorText);
      
      // Check for specific error messages
      if (response.status === 404) {
        return NextResponse.json({ 
          response: 'The AutoRAG knowledge base "alleato-docs" was not found. Please ensure it has been created in your Cloudflare account.' 
        });
      }
      
      throw new Error(`AutoRAG API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;
    console.log('AutoRAG response:', JSON.stringify(data, null, 2));
    
    // Extract the AI response from AutoRAG
    let aiResponse = data.result?.response || data.response || 'I apologize, but I could not generate a response at this time.';
    
    // If AutoRAG returns no matches, provide a helpful message
    if (data.result?.matches && data.result.matches.length === 0) {
      aiResponse = "I couldn't find any relevant documents for your query. This might be because:\n\n1. The knowledge base is empty - try syncing some meetings first\n2. Your query doesn't match any indexed content\n3. Try rephrasing your question or being more specific";
    }
    
    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Check for common configuration issues
    if (error instanceof Error) {
      if (error.message.includes('CLOUDFLARE_ACCOUNT_ID')) {
        return NextResponse.json({ 
          response: 'Configuration error: CLOUDFLARE_ACCOUNT_ID is not set. Please check your environment variables.' 
        });
      }
      if (error.message.includes('CLOUDFLARE_API_TOKEN')) {
        return NextResponse.json({ 
          response: 'Configuration error: CLOUDFLARE_API_TOKEN is not set. Please check your environment variables.' 
        });
      }
      if (error.message.includes('404')) {
        return NextResponse.json({ 
          response: 'The AutoRAG knowledge base was not found. Please ensure "alleato-docs" has been created in your Cloudflare account.' 
        });
      }
    }
    
    return NextResponse.json({ 
      response: 'I apologize, but I encountered an error while processing your request. Please try again later.' 
    }, { status: 200 }); // Return 200 to display error message in chat
  }
}

// Helper function to format search results
function formatSearchResults(results: any[]): string {
  if (!results || results.length === 0) {
    return '';
  }
  
  const formatted = results.map((result, index) => {
    const title = result.metadata?.title || `Document ${index + 1}`;
    const summary = result.content?.substring(0, 200) + '...' || 'No content available';
    const score = result.score?.toFixed(2) || 'N/A';
    
    return `**${title}** (Relevance: ${score})\n${summary}`;
  }).join('\n\n');
  
  return `\n\n**Related Documents:**\n${formatted}`;
}