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
    const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000);

    // Upsert on phone so we never insert a duplicate, and never set email at
    // all — the sparse unique index on email skips documents without the field.
    await users.findOneAndUpdate(
      { phone },
      {
        $set: { otp, otpExpiresAt: otpExpiry, updatedAt: now },
        $setOnInsert: {
          name: phone,
          phone,
          password: null,
          isVerified: false,
          provider: 'phone',
          role: 'admin',
          plan: 'free',
          createdAt: now,
          __v: 0,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      ok: true,
      message: 'OTP sent to your phone',
    });
  } catch (err) {
    console.error('Phone OTP send error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
