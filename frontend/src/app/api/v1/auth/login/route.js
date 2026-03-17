import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Email and password are required' }, { status: 400 });
    }

    const users = await getCollection('users');
    const user = await users.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isVerified) {
      return NextResponse.json(
        { ok: false, needsVerification: true, email: user.email },
        { status: 403 }
      );
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const safeUser = {
      user_id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role || 'admin',
      plan: user.plan || 'free',
      provider: user.provider || 'local',
      created_at: user.createdAt,
      avatar: user.avatar || null,
    };

    return NextResponse.json({ ok: true, token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
