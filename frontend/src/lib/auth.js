/**
 * Auth helpers: JWT issuing / verification and password hashing.
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'voiceai-dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';

// ── JWT ──────────────────────────────────────────────────────────────────────

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Extract and verify the Bearer token from a request.
 * Returns the decoded payload or null.
 */
export function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
}

// ── Password ─────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 10;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

// ── OTP ──────────────────────────────────────────────────────────────────────

export function generateOtp(length = 6) {
  return crypto.randomInt(10 ** (length - 1), 10 ** length).toString();
}
