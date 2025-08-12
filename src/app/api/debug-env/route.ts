import { NextRequest, NextResponse } from 'next/server';

// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment

export async function GET(request: NextRequest) {
  try {
    // Try different ways to access the environment
    let contextResult = null;
    let processEnvResult = null;
    let globalThisResult = null;
    
    // Try 1: getCloudflareContext without async
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const context = await getCloudflareContext();
      contextResult = {
        hasContext: !!context,
        hasEnv: !!context?.env,
        hasDB: !!context?.env?.DB,
        envKeys: context?.env ? Object.keys(context.env) : []
      };
    } catch (e) {
      contextResult = { error: e.message };
    }
    
    // Try 2: Check process.env
    try {
      processEnvResult = {
        hasCloudflareAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
        hasR2BucketName: !!process.env.R2_BUCKET_NAME,
        hasNotionApiKey: !!process.env.NOTION_API_KEY,
        envKeys: Object.keys(process.env).filter(k => k.includes('CLOUDFLARE') || k.includes('R2') || k.includes('NOTION'))
      };
    } catch (e) {
      processEnvResult = { error: e.message };
    }
    
    // Try 3: Check globalThis
    try {
      globalThisResult = {
        hasDB: !!(globalThis as any).DB,
        hasR2: !!(globalThis as any).R2_BUCKET,
        keys: Object.keys(globalThis).filter(k => k.includes('DB') || k.includes('R2') || k.includes('BUCKET'))
      };
    } catch (e) {
      globalThisResult = { error: e.message };
    }
    
    return NextResponse.json({
      success: true,
      runtime: 'edge',
      contextResult,
      processEnvResult,
      globalThisResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}