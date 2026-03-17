import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Avatar upload is a stub for now — would need cloud storage (S3/R2/etc.)
    // Just acknowledge the upload so the frontend doesn't break.
    return NextResponse.json({ ok: true, data: {} });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
