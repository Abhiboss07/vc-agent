import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { phone, otp } = await request.json();
    if (!phone || !otp) {
      return NextResponse.json({ ok: false, error: 'Phone and OTP are required' }, { status: 400 });
    }

    const users = await getCollection('users');
    const user = await users.findOne({ phone });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Account not found' }, { status: 404 });
    }

    if (user.otp !== otp) {
      return NextResponse.json({ ok: false, error: 'Invalid OTP' }, { status: 400 });
    }

    if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
      return NextResponse.json({ ok: false, error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    await users.updateOne(
      { _id: user._id },
      { $set: { isVerified: true, otp: null, otpExpiresAt: null, updatedAt: new Date() } }
    );

    const token = signToken({ userId: user._id.toString(), phone: user.phone, name: user.name });

    return NextResponse.json({
      ok: true,
      token,
      user: {
        user_id: user._id.toString(),
        name: user.name,
        email: user.email || null,
        phone: user.phone,
        role: user.role || 'admin',
        plan: user.plan || 'free',
        provider: user.provider || 'phone',
        created_at: user.createdAt,
        avatar: user.avatar || null,
      },
    });
  } catch (err) {
    console.error('Phone OTP verify error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
