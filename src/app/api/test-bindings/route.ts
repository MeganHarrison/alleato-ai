import { NextRequest, NextResponse } from 'next/server';

// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment

export async function GET(request: NextRequest) {
  try {
    // In Cloudflare Workers, bindings are typically available on the request context
    // Try to access them directly
    const env = (request as any).env || (globalThis as any).env || {};
    
    // Also try process.env for environment variables
    const processEnv = typeof process !== 'undefined' ? process.env : {};
    
    // Check what's available
    const result = {
      success: true,
      hasEnv: !!env,
      envKeys: Object.keys(env),
      hasDB: !!env.DB,
      hasR2: !!env.R2_BUCKET,
      hasAssets: !!env.ASSETS,
      processEnvKeys: Object.keys(processEnv).filter(k => 
        k.includes('CLOUDFLARE') || 
        k.includes('R2') || 
        k.includes('NOTION') ||
        k.includes('OPENAI')
      ),
      // Try to test D1 if available
      d1Test: null,
      mockData: null
    };
    
    // If we have DB, try to query it
    if (env.DB) {
      try {
        const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' LIMIT 5").all();
        result.d1Test = { success: true, tables: tables.results };
      } catch (e) {
        result.d1Test = { success: false, error: e.message };
      }
    } else {
      // Return mock data if D1 is not available
      result.mockData = [
        { id: 1, name: "Mock Project 1", status: "Active" },
        { id: 2, name: "Mock Project 2", status: "Completed" }
      ];
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}