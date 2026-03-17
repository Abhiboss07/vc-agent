import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * POST /api/v1/calls/upload-numbers — Upload CSV phone numbers for a campaign
 */
export async function POST(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId') || null;
    const mode = searchParams.get('mode') || 'append';

    const csvText = await request.text();
    const lines = csvText.split('\n').filter(l => l.trim());

    let accepted = 0;
    let rejected = 0;
    const numbers = [];

    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      const phone = parts[0];
      // Basic phone validation
      if (phone && phone.match(/^\+?\d{7,15}$/)) {
        numbers.push({
          phoneNumber: phone,
          name: parts[1] || null,
          email: parts[2] || null,
        });
        accepted++;
      } else {
        rejected++;
      }
    }

    // Save to leads collection
    const leads = await getCollection('leads');

    if (mode === 'replace' && campaignId) {
      await leads.deleteMany({ campaignId, userId: payload.userId });
    }

    if (numbers.length > 0) {
      const docs = numbers.map(n => ({
        ...n,
        campaignId,
        userId: payload.userId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      await leads.insertMany(docs);
    }

    // Record the upload in uploadlogs collection (note schema uses uploadlogs)
    const uploads = await getCollection('uploadlogs');
    await uploads.insertOne({
      userId: payload.userId,
      campaignId,
      mode,
      recordsAccepted: accepted,
      recordsRejected: rejected,
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    });

    return NextResponse.json({
      ok: true,
      results: { accepted, rejected },
    });
  } catch (err) {
    console.error('Upload numbers error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
