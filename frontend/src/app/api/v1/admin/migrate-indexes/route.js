import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * One-time migration: converts the users.email index from a regular unique
 * index to a sparse unique index, so phone-only users (no email field) don't
 * collide with each other on the unique constraint.
 *
 * Protected by MIGRATION_SECRET env var. Call once after deploying:
 *   POST /api/v1/admin/migrate-indexes
 *   Authorization: Bearer <MIGRATION_SECRET>
 */
export async function POST(request) {
  const secret = process.env.MIGRATION_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'MIGRATION_SECRET not configured' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const users = db.collection('users');

    // List current indexes to check what we're working with
    const existingIndexes = await users.indexes();
    const emailIndex = existingIndexes.find((idx) => idx.name === 'email_1');

    const steps = [];

    if (emailIndex) {
      if (emailIndex.sparse) {
        steps.push('email_1 index is already sparse — no change needed');
      } else {
        await users.dropIndex('email_1');
        steps.push('Dropped non-sparse email_1 index');

        await users.createIndex({ email: 1 }, { unique: true, sparse: true });
        steps.push('Created sparse unique email_1 index');
      }
    } else {
      await users.createIndex({ email: 1 }, { unique: true, sparse: true });
      steps.push('Created sparse unique email_1 index (did not exist before)');
    }

    // Clean up any leftover email: null documents by unsetting the field
    const cleanup = await users.updateMany(
      { email: null },
      { $unset: { email: '' } }
    );
    steps.push(`Unset email field on ${cleanup.modifiedCount} document(s) that had email: null`);

    return NextResponse.json({ ok: true, steps });
  } catch (err) {
    console.error('Migration error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
