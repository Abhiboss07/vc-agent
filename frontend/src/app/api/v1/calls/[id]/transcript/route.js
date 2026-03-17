import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/calls/[id]/transcript — Get call transcript
 */
export async function GET(request, { params }) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid ID' }, { status: 400 });
    }

    const transcripts = await getCollection('transcripts');
    const transcript = await transcripts.findOne({ callId: new ObjectId(id) });

    return NextResponse.json({
      ok: true,
      data: transcript?.entries || [],
    });
  } catch (err) {
    console.error('GET /calls/[id]/transcript error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
