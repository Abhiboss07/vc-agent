import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { hashPassword, generateOtp } from '@/lib/auth';
import { sendOtp } from '@/lib/otp';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !password || (!email && !phone)) {
      return NextResponse.json({ ok: false, error: 'Name, password, and email or phone are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const users = await getCollection('users');

    // Check for existing user
    const query = email ? { email: email.toLowerCase() } : { phone };
    const existing = await users.findOne(query);
    if (existing) {
      return NextResponse.json({ ok: false, error: 'An account with this credential already exists' }, { status: 409 });
    }

    const now = new Date();
    let otp;

    if (phone) {
      try {
        otp = await sendOtp(phone, name);
      } catch (err) {
        console.error('SMS send failed during signup:', err);
        return NextResponse.json({ ok: false, error: 'Failed to send OTP. Please try again.' }, { status: 502 });
      }
    } else {
      otp = generateOtp();
    }

    const user = {
      name,
      email: email ? email.toLowerCase() : null,
      phone: phone || null,
      password: await hashPassword(password),
      isVerified: false,
      otp,
      otpExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      provider: phone ? 'phone' : 'local',
      role: 'admin',
      plan: 'free',
      createdAt: now,
      updatedAt: now,
      __v: 0,
    };

    await users.insertOne(user);

    const isDev = process.env.NODE_ENV !== 'production';
    const response = {
      ok: true,
      message: phone ? 'OTP sent to your phone' : 'Verification code sent to your email',
    };

    if (!phone && isDev) {
      response.devOtp = otp;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
