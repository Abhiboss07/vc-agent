import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ ok: false, error: 'Email and code are required' }, { status: 400 });
    }

    const users = await getCollection('users');
    const user = await users.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Account not found' }, { status: 404 });
    }

    if (user.isVerified) {
      // Already verified
      const token = signToken({ userId: user._id.toString(), email: user.email, name: user.name });
      return NextResponse.json({
        ok: true,
        token,
        user: {
          user_id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          role: user.role || 'admin',
          plan: user.plan || 'free',
          provider: user.provider || 'local',
          created_at: user.createdAt,
          avatar: user.avatar || null,
        },
      });
    }

    // Validate OTP
    if (user.otp !== code) {
      return NextResponse.json({ ok: false, error: 'Invalid verification code' }, { status: 400 });
    }

    if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
      return NextResponse.json({ ok: false, error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // Mark as verified
    await users.updateOne(
      { _id: user._id },
      { $set: { isVerified: true, otp: null, otpExpiresAt: null, updatedAt: new Date() } }
    );

    const token = signToken({ userId: user._id.toString(), email: user.email, name: user.name });

    return NextResponse.json({
      ok: true,
      token,
      user: {
        user_id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role || 'admin',
        plan: user.plan || 'free',
        provider: user.provider || 'local',
        created_at: user.createdAt,
        avatar: user.avatar || null,
      },
    });
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
