import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getCollection('users');
    const user = await users.findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { password: 0, otp: 0, otpExpiresAt: 0 } }
    );

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        user_id: user._id.toString(),
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        role: user.role || 'admin',
        plan: user.plan || 'free',
        provider: user.provider || 'local',
        created_at: user.createdAt,
        avatar: user.avatar || null,
        workspace_id: user._id.toString().slice(0, 8),
      },
    });
  } catch (err) {
    console.error('Auth me error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
