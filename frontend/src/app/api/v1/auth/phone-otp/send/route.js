import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { sendOtp } from '@/lib/otp';

export async function POST(request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ ok: false, error: 'Phone number is required' }, { status: 400 });
    }

    const users = await getCollection('users');
    let user = await users.findOne({ phone });

    // Send OTP via SMS gateway
    let otp;
    try {
      otp = await sendOtp(phone, user?.name || 'User');
    } catch (err) {
      console.error('SMS send failed:', err);
      return NextResponse.json({ ok: false, error: 'Failed to send OTP. Please try again.' }, { status: 502 });
    }

    const now = new Date();

    if (!user) {
      // Auto-create a user record for phone-based login
      // email is intentionally omitted (not null) so the sparse unique index on email
      // allows multiple phone-only users without collision
      await users.insertOne({
        name: phone,
        phone,
        password: null,
        isVerified: false,
        otp,
        otpExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
        provider: 'phone',
        role: 'admin',
        plan: 'free',
        createdAt: now,
        updatedAt: now,
        __v: 0,
      });
    } else {
      await users.updateOne(
        { _id: user._id },
        { $set: { otp, otpExpiresAt: new Date(now.getTime() + 10 * 60 * 1000) } }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'OTP sent to your phone',
    });
  } catch (err) {
    console.error('Phone OTP send error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
