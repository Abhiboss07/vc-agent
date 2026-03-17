import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/knowledge-bases — List knowledge bases
 */
export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: true, data: [] });

    // Note: collection is named "knowledgebases" not "knowledge_bases" in the DB
    const kbs = await getCollection('knowledgebases');
    let data = await kbs.find({ userId: payload.userId }).sort({ createdAt: -1 }).toArray();

    // Fallback if no user linked to KBs (for dev testing)
    if (data.length === 0) {
      data = await kbs.find({}).sort({ createdAt: -1 }).toArray();
    }

    return NextResponse.json({
      ok: true,
      data: data.map(kb => ({
        ...kb,
        _id: kb._id.toString(),
        created_at: kb.createdAt,
      })),
    });
  } catch (err) {
    console.error('Knowledge bases error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/knowledge-bases — Create a knowledge base
 */
export async function POST(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const kbs = await getCollection('knowledgebases');

    const now = new Date();
    const doc = {
      name: body.name || 'New Knowledge Base',
      companyName: body.companyName || '',
      agentName: body.agentName || 'Agent',
      systemPrompt: body.systemPrompt || '',
      userId: payload.userId,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    };

    const result = await kbs.insertOne(doc);

    return NextResponse.json({
      ok: true,
      data: {
        ...doc,
        _id: result.insertedId.toString(),
        created_at: now,
      },
    });
  } catch (err) {
    console.error('Create knowledge base error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
