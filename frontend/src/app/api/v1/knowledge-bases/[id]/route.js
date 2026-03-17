import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/knowledge-bases/[id] — Get a knowledge base
 */
export async function GET(request, { params }) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid ID' }, { status: 400 });
    }

    const kbs = await getCollection('knowledgebases');
    let kb = await kbs.findOne({ _id: new ObjectId(id), userId: payload.userId });

    // Fallback if not linked to user (for dev)
    if (!kb) {
      kb = await kbs.findOne({ _id: new ObjectId(id) });
    }

    if (!kb) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      data: {
        ...kb,
        _id: kb._id.toString(),
        created_at: kb.createdAt,
      },
    });
  } catch (err) {
    console.error('Get KB error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/knowledge-bases/[id] — Update a knowledge base
 */
export async function PUT(request, { params }) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const kbs = await getCollection('knowledgebases');

    const updates = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.companyName !== undefined) updates.companyName = body.companyName;
    if (body.agentName !== undefined) updates.agentName = body.agentName;
    if (body.systemPrompt !== undefined) updates.systemPrompt = body.systemPrompt;

    // We can just update by ID since dev fallback might mean the user doesn't own it
    const query = { _id: new ObjectId(id) };
    
    const result = await kbs.updateOne(query, { $set: updates });
    
    if (result.matchedCount === 0) {
       return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: {} });
  } catch (err) {
    console.error('Update KB error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/knowledge-bases/[id] — Delete a knowledge base
 */
export async function DELETE(request, { params }) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid ID' }, { status: 400 });
    }

    const kbs = await getCollection('knowledgebases');
    await kbs.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete KB error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
