import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { hashPassword, generateOtp } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ ok: false, error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const users = await getCollection('users');

    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ ok: false, error: 'An account with this email already exists' }, { status: 409 });
    }

    const otp = generateOtp();
    const now = new Date();

    const user = {
      name,
      email: email.toLowerCase(),
      password: await hashPassword(password),
      isVerified: false,
      otp,
      otpExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      provider: 'local',
      role: 'admin',
      plan: 'free',
      createdAt: now,
      updatedAt: now,
      __v: 0,
    };

    await users.insertOne(user);

    try {
      await sendOtpEmail(email.toLowerCase(), otp, name);
    } catch (err) {
      console.error('Email send failed during signup:', err);
      // Don't block signup — return devOtp so user can still verify
      return NextResponse.json({
        ok: true,
        message: 'Account created. Email delivery failed — use the code below.',
        devOtp: otp,
      });
    }

    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({
      ok: true,
      message: 'Verification code sent to your email',
      ...(isDev ? { devOtp: otp } : {}),
    });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
