/**
 * MongoDB connection singleton for Next.js API routes.
 *
 * Uses a global cache so the connection is re-used across hot-reloads in dev
 * and across concurrent serverless invocations in production.
 */
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vcagent';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || null; // e.g. 'ai_outbound'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/** @type {{ client: MongoClient | null, promise: Promise<MongoClient> | null }} */
let cached = global._mongoClientPromise
  ? { client: null, promise: global._mongoClientPromise }
  : { client: null, promise: null };

async function getClient() {
  if (cached.client) return cached.client;

  if (!cached.promise) {
    cached.promise = MongoClient.connect(MONGODB_URI);
    global._mongoClientPromise = cached.promise;
  }

  cached.client = await cached.promise;
  return cached.client;
}

/**
 * Returns the default database from the connection string.
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDb() {
  const client = await getClient();
  return client.db(MONGODB_DB_NAME || undefined);
}

/**
 * Shorthand: returns a collection from the default database.
 * @param {string} name
 * @returns {Promise<import('mongodb').Collection>}
 */
export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}
