import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function DELETE(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getCollection('users');
    await users.deleteOne({ _id: new ObjectId(payload.userId) });

    // Also clean up related data
    const calls = await getCollection('calls');
    await calls.deleteMany({ user_id: payload.userId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Account delete error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
