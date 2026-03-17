import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { dispatchCall } from '@/lib/livekit';
import { getCollection } from '@/lib/db';

/**
 * POST /api/v1/calls/start — Alternative call start endpoint used by test-call page
 */
export async function POST(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const phoneNumber = body.phoneNumber || body.phone_number;
    const campaignId = body.campaignId || body.campaign_id || null;

    if (!phoneNumber) {
      return NextResponse.json({ ok: false, error: 'phoneNumber is required' }, { status: 400 });
    }

    const result = await dispatchCall({
      phoneNumber,
      agentName: 'my-agent',
    });

    // Persist call record with correct schema map
    const callsCollection = await getCollection('calls');
    const now = new Date();
    
    const callRecord = {
      campaignId: campaignId,
      userId: payload.userId,
      phoneNumber: phoneNumber,
      callSid: result.sip_call_id,
      status: 'dispatched',
      direction: 'outbound',
      language: 'hinglish',
      durationSec: 0,
      createdAt: now,
      updatedAt: now,
      __v: 0,
      metadata: {}
    };

    const inserted = await callsCollection.insertOne(callRecord);

    return NextResponse.json({
      ok: true,
      callId: inserted.insertedId.toString(),
      callSid: result.sip_call_id,
      ...result,
    });
  } catch (err) {
    console.error('POST /calls/start error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Failed to start call' }, { status: 500 });
  }
}
