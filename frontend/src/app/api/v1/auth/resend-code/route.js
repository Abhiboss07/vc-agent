import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { generateOtp } from '@/lib/auth';
import { sendOtp } from '@/lib/otp';

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ ok: false, error: 'Email is required' }, { status: 400 });
    }

    const users = await getCollection('users');
    const user = await users.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Account not found' }, { status: 404 });
    }

    let otp;

    if (user.phone) {
      // User has a phone — send OTP via SMS
      try {
        otp = await sendOtp(user.phone, user.name || 'User');
      } catch (err) {
        console.error('SMS send failed during resend:', err);
        // Fall back to generating OTP without delivery
        otp = generateOtp();
      }
    } else {
      // Email-only account — no email provider, generate OTP
      otp = generateOtp();
    }

    await users.updateOne(
      { _id: user._id },
      { $set: { otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) } }
    );

    const isDev = process.env.NODE_ENV !== 'production';

    return NextResponse.json({
      ok: true,
      message: 'New verification code sent',
      // Only show devOtp if we couldn't send via SMS
      ...(!user.phone && isDev ? { devOtp: otp } : {}),
    });
  } catch (err) {
    console.error('Resend code error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
