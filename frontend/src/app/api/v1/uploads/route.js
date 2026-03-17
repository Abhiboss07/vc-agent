import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/uploads — Upload history
 */
export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: true, data: [] });

    // Note: collection is named "uploadlogs"
    const uploads = await getCollection('uploadlogs');
    let data = await uploads.find({ userId: payload.userId }).sort({ createdAt: -1 }).limit(50).toArray();

    // Fallback if no user linked to logs (for dev testing)
    if (data.length === 0) {
       data = await uploads.find({}).sort({ createdAt: -1 }).limit(50).toArray();
    }

    return NextResponse.json({
      ok: true,
      data: data.map(u => ({
        ...u,
        _id: u._id.toString(),
        createdAt: u.createdAt, // CSV page uses createdAt in lowercase format
      })),
    });
  } catch (err) {
    console.error('Uploads error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
