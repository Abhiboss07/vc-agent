import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone } = await request.json();
    const updates = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;

    const users = await getCollection('users');
    await users.updateOne({ _id: new ObjectId(payload.userId) }, { $set: updates });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
