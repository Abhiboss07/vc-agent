import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/metrics — Dashboard aggregate metrics
 */
export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: true, data: { total_calls: 0, active_calls: 0, success_rate: 0, total_minutes: 0, lead_conversion: 0 } });
    }

    const calls = await getCollection('calls');
    let allCalls = await calls.find({ userId: payload.userId }).toArray();
    
    if (allCalls.length === 0) {
       // fallback if no calls linked to user ID
       allCalls = await calls.find({}).toArray();
    }

    const total = allCalls.length;
    const completed = allCalls.filter(c => c.status === 'completed').length;
    const active = allCalls.filter(c => ['dispatched', 'active', 'in-progress', 'ringing'].includes(c.status)).length;
    const totalSeconds = allCalls.reduce((sum, c) => sum + (c.durationSec || 0), 0);

    return NextResponse.json({
      ok: true,
      data: {
        total_calls: total,
        active_calls: active,
        success_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        total_minutes: Math.round(totalSeconds / 60),
        lead_conversion: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('Metrics error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
