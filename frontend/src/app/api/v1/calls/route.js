import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { dispatchCall } from '@/lib/livekit';

/**
 * GET /api/v1/calls — List calls
 * Transforms MongoDB camelCase schema to frontend expected snake_case format.
 */
export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: true, data: [], total: 0 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const skip = parseInt(searchParams.get('skip') || '0');

    const calls = await getCollection('calls');
    
    // Attempt standard query. If it's a shared DB for testing, we might want to drop user filtering 
    // to see all calls if they lack user mapping. Try user filter first.
    let query = { userId: payload.userId };
    let count = await calls.countDocuments(query);
    
    // Fallback: If no records tied to user, fetch all records (temporary dev setup support)
    if (count === 0 && (await calls.countDocuments({})) > 0) {
       query = {};
       count = await calls.countDocuments(query);
    }

    const data = await calls.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();

    // Map DB fields to what the frontend expects
    const normalised = data.map(c => ({
      ...c,
      call_id: c._id.toString(),
      _id: undefined,
      phone_number: c.phoneNumber,
      lead_phone: c.phoneNumber,
      sip_call_id: c.callSid,
      participant_id: c.callSid, // Proxy uses this conceptually
      duration: c.durationSec || 0,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      agent_name: 'AI Agent',
      assistant_name: 'AI Agent',
    }));

    return NextResponse.json({ ok: true, data: normalised, total: count });
  } catch (err) {
    console.error('GET /calls error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/calls — Create a new outbound call via LiveKit SIP
 */
export async function POST(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const phoneNumber = body.phone_number || body.phoneNumber;

    if (!phoneNumber) {
      return NextResponse.json({ ok: false, error: 'phone_number is required' }, { status: 400 });
    }

    // Dispatch call via LiveKit Server SDK
    const result = await dispatchCall({
      phoneNumber,
      agentName: 'my-agent',
      instructions: body.instructions,
      metadata: body.metadata,
    });

    // Persist the call record in MongoDB with the correct camelCase schema
    const callsCollection = await getCollection('calls');
    const now = new Date();
    
    const callRecord = {
      campaignId: body.campaignId || null,
      userId: payload.userId,
      phoneNumber: phoneNumber,
      callSid: result.sip_call_id,
      status: 'dispatched',
      direction: 'outbound',
      language: body.language || 'hinglish',
      durationSec: 0,
      createdAt: now,
      updatedAt: now,
      __v: 0,
      metadata: body.metadata || {}
    };

    const inserted = await callsCollection.insertOne(callRecord);

    return NextResponse.json({
      ok: true,
      call_id: inserted.insertedId.toString(),
      ...result,
    });
  } catch (err) {
    console.error('POST /calls error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Failed to dispatch call' }, { status: 500 });
  }
}
