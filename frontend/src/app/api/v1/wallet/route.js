import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/v1/wallet — Wallet/billing data computed from call records
 */
export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    const emptyWallet = {
      ok: true,
      data: { currentBalance: 0, totalSpend: 0, spendChange: 0, totalCalls: 0, dailyBreakdown: [], transactions: [] },
    };

    if (!payload) return NextResponse.json(emptyWallet);

    const calls = await getCollection('calls');
    let allCalls = await calls.find({ userId: payload.userId }).sort({ createdAt: -1 }).toArray();
    
    // Fallback if no user linked to calls
    if (allCalls.length === 0) {
       allCalls = await calls.find({}).sort({ createdAt: -1 }).toArray();
    }

    if (allCalls.length === 0) return NextResponse.json(emptyWallet);

    // Daily breakdown
    const dailyMap = {};
    allCalls.forEach(c => {
      if (!c.createdAt) return;
      const dateKey = new Date(c.createdAt).toISOString().split('T')[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, calls: 0, spend: 0 };
      dailyMap[dateKey].calls++;
    });
    const dailyBreakdown = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

    // Spend change
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const todayCalls = dailyMap[today]?.calls ?? 0;
    const yesterdayCalls = dailyMap[yesterday]?.calls ?? 0;
    const spendChange = yesterdayCalls > 0
      ? Math.round(((todayCalls - yesterdayCalls) / yesterdayCalls) * 100)
      : 0;

    // Transactions from call records
    const transactions = allCalls.slice(0, 20).map(c => ({
      id: c._id.toString(),
      type: 'call',
      description: `Call to ${c.phoneNumber || 'Unknown'}`,
      time: c.createdAt,
      duration: c.durationSec
        ? `${Math.floor(c.durationSec / 60)}:${String(c.durationSec % 60).padStart(2, '0')}`
        : null,
      amount: 0,
      status: c.status || 'completed',
    }));

    return NextResponse.json({
      ok: true,
      data: {
        currentBalance: 0, // stub
        totalSpend: 0,     // stub
        spendChange,
        totalCalls: allCalls.length,
        dailyBreakdown,
        transactions,
      },
    });
  } catch (err) {
    console.error('Wallet error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
