import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/campaigns — List campaigns
 */
export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: true, data: [] });

    const campaigns = await getCollection('campaigns');
    let data = await campaigns.find({ userId: payload.userId }).sort({ createdAt: -1 }).toArray();

    // Fallback if no user linked to campaigns (for dev testing)
    if (data.length === 0) {
      data = await campaigns.find({}).sort({ createdAt: -1 }).toArray();
    }

    return NextResponse.json({
      ok: true,
      data: data.map(c => ({
        ...c,
        _id: c._id.toString(),
        knowledgeBaseId: c.knowledgeBaseId?.toString() || null,
        created_at: c.createdAt,
      })),
    });
  } catch (err) {
    console.error('Campaigns error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/campaigns — Create a campaign
 */
export async function POST(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const campaigns = await getCollection('campaigns');

    const now = new Date();
    const doc = {
      name: body.name || 'New Campaign',
      knowledgeBaseId: body.knowledgeBaseId ? new ObjectId(body.knowledgeBaseId) : null,
      userId: payload.userId,
      script: [],
      costBudgetPerMin: 0,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    };

    const result = await campaigns.insertOne(doc);

    return NextResponse.json({
      ok: true,
      data: {
        ...doc,
        _id: result.insertedId.toString(),
        knowledgeBaseId: doc.knowledgeBaseId?.toString() || null,
        created_at: now,
      },
    });
  } catch (err) {
    console.error('Create campaign error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
