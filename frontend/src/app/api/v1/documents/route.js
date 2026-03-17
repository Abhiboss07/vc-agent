import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/documents — List documents
 */
export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: true, data: [] });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'All Documents';

    const docs = await getCollection('documents');
    const query = { userId: payload.userId };
    if (category && category !== 'All Documents') {
      query.category = category;
    }

    let data = await docs.find(query).sort({ createdAt: -1 }).toArray();

    // Development fallback
    if (data.length === 0) {
       let fallbackQuery = {};
       if (category && category !== 'All Documents') {
          fallbackQuery.category = category;
       }
       data = await docs.find(fallbackQuery).sort({ createdAt: -1 }).toArray();
    }

    return NextResponse.json({
      ok: true,
      data: data.map(d => ({
        ...d,
        _id: d._id.toString(),
        created_at: d.createdAt,
      })),
    });
  } catch (err) {
    console.error('Documents error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/documents — Upload/create a document
 */
export async function POST(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const docs = await getCollection('documents');

    const now = new Date();
    const doc = {
      name: body.name || 'Untitled',
      category: body.category || 'General',
      content: body.content || '',
      knowledgeBaseId: body.knowledgeBaseId || null,
      userId: payload.userId,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    };

    const result = await docs.insertOne(doc);

    return NextResponse.json({
      ok: true,
      data: {
        ...doc,
        _id: result.insertedId.toString(),
        created_at: now,
      },
    });
  } catch (err) {
    console.error('Create document error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
