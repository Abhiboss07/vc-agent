import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/calls/[id] — Get call details
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

    const calls = await getCollection('calls');
    let call = await calls.findOne({ _id: new ObjectId(id), userId: payload.userId });
    
    // Fallback for missing userId mapping
    if (!call) {
        call = await calls.findOne({ _id: new ObjectId(id) });
    }

    if (!call) {
      return NextResponse.json({ ok: false, error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...call,
        call_id: call._id.toString(),
        _id: undefined,
        phone_number: call.phoneNumber,
        lead_phone: call.phoneNumber,
        sip_call_id: call.callSid,
        participant_id: call.callSid,
        duration: call.durationSec || 0,
        created_at: call.createdAt,
        updated_at: call.updatedAt,
      },
    });
  } catch (err) {
    console.error('GET /calls/[id] error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
