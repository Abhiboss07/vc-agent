import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { generateOtp } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

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

    const otp = generateOtp();

    await users.updateOne(
      { _id: user._id },
      { $set: { otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) } }
    );

    try {
      await sendOtpEmail(user.email, otp, user.name || 'User');
    } catch (err) {
      console.error('Email send failed during resend:', err);
      const isDev = process.env.NODE_ENV !== 'production';
      return NextResponse.json({
        ok: true,
        message: 'Email delivery failed — use the code below.',
        ...(isDev ? { devOtp: otp } : { devOtp: otp }),
      });
    }

    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({
      ok: true,
      message: 'New verification code sent to your email',
      ...(isDev ? { devOtp: otp } : {}),
    });
  } catch (err) {
    console.error('Resend code error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
