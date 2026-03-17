import { NextResponse } from 'next/server';

/**
 * GET /api/v1/stats — General stats (stub)
 */
export async function GET() {
  return NextResponse.json({ ok: true, data: {} });
}
