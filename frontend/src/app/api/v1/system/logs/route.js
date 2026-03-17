import { NextResponse } from 'next/server';

/**
 * GET /api/v1/system/logs — System logs (stub)
 */
export async function GET() {
  return NextResponse.json({ ok: true, data: [] });
}
