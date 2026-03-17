import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/assistants — List saved assistants for the user
 */
export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: true, assistants: [] });
    }

    const assistants = await getCollection('assistants');
    const data = await assistants.find({ user_id: payload.userId }).sort({ created_at: -1 }).toArray();

    return NextResponse.json({
      ok: true,
      assistants: data.map(a => ({
        ...a,
        assistant_id: a._id.toString(),
        _id: undefined,
      })),
    });
  } catch (err) {
    console.error('Assistants error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/assistants — Create a new assistant
 */
export async function POST(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const assistants = await getCollection('assistants');

    const doc = {
      name: body.name || 'New Assistant',
      instructions: body.instructions || '',
      voice: body.voice || 'v1',
      user_id: payload.userId,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await assistants.insertOne(doc);

    return NextResponse.json({
      ok: true,
      data: { ...doc, assistant_id: result.insertedId.toString() },
    });
  } catch (err) {
    console.error('Create assistant error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
