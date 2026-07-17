import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = 'ct_admin';
const SESSION_TTL = '8h';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function getSecret() {
  const secret = process.env.COST_TRACKER_AUTH_SECRET;
  if (!secret) throw new Error('COST_TRACKER_AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecret());
}

async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/** Verifies the PIN step-up session cookie. This is the "superadmin unlocked" check used by every locked action. */
export async function isPinAdmin(req: NextRequest): Promise<boolean> {
  return verifyToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

/** Same check, for use in Server Components (page.tsx) which read cookies via next/headers instead of NextRequest. */
export async function isPinAdminFromCookies(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE_NAME)?.value);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function timingSafeEqualPin(a: string, b: string): boolean {
  const bufA = Buffer.from(a.padEnd(32, '\0'));
  const bufB = Buffer.from(b.padEnd(32, '\0'));
  return crypto.timingSafeEqual(bufA, bufB) && a.length === b.length;
}

// BLUEPRINT-DECISION: in-memory rate limiting is process-local (fine for a single-instance
// internal tool per the blueprint's own threat model — not distributed-safe, no DB round-trip needed).
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) return { allowed: true, retryAfterMs: 0 };
  return { allowed: entry.count < MAX_ATTEMPTS, retryAfterMs: Math.max(0, entry.resetAt - now) };
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

export function clearAttempts(ip: string) {
  attempts.delete(ip);
}

export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}
