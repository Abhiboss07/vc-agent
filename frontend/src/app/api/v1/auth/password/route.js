import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/db';
import { getUserFromRequest, comparePassword, hashPassword } from '@/lib/auth';

export async function PUT(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, error: 'Both current and new passwords are required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const users = await getCollection('users');
    const user = await users.findOne({ _id: new ObjectId(payload.userId) });
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    const match = await comparePassword(currentPassword, user.password);
    if (!match) {
      return NextResponse.json({ ok: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);
    await users.updateOne(
      { _id: user._id },
      { $set: { password: hashed, updated_at: new Date() } }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Password change error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
