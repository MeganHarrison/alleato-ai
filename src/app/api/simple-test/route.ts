import { NextRequest, NextResponse } from 'next/server';

// export const runtime = 'edge'; // Handled by Cloudflare Workers deployment

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Simple test endpoint working",
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries())
  });
}