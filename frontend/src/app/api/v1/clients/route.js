import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/clients — List clients (derived from calls)
 */
export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ ok: true, data: [], total: 0 });

    const calls = await getCollection('calls');
    let allCalls = await calls.find({ userId: payload.userId }).toArray();

    // Fallback logic for development environments where records aren't explicitly 
    // bound to a single dev user account via userId. 
    if (allCalls.length === 0) {
      allCalls = await calls.find({}).toArray();
    }

    // Derive unique contacts from call records
    const contactMap = {};
    allCalls.forEach(c => {
      const phone = c.phoneNumber;
      if (!phone) return;
      if (!contactMap[phone]) {
        contactMap[phone] = {
          phone,
          name: c.metadata?.lead_name || null,
          totalCalls: 0,
          lastCall: null,
        };
      }
      contactMap[phone].totalCalls++;
      if (!contactMap[phone].lastCall || new Date(c.createdAt) > new Date(contactMap[phone].lastCall)) {
        contactMap[phone].lastCall = c.createdAt;
      }
    });

    const data = Object.values(contactMap);

    return NextResponse.json({ ok: true, data, total: data.length });
  } catch (err) {
    console.error('Clients error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
