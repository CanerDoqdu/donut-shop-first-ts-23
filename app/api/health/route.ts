import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Lightweight liveness probe for uptime monitors and load balancers.
 * Returns 200 with JSON body containing status, timestamp, and version.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0-dev',
  });
}
