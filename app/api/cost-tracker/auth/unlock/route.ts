import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import {
  ADMIN_COOKIE_NAME, adminCookieOptions, checkRateLimit, clearAttempts,
  getClientIp, recordFailedAttempt, signAdminToken, timingSafeEqualPin,
} from '@/lib/costPinAuth';
import { unlockSchema } from '@/lib/costValidators';

export async function POST(req: NextRequest) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterMs / 60000)} min.` },
      { status: 429 },
    );
  }

  const parsed = unlockSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const pin = process.env.COST_TRACKER_PIN;
  if (!pin) return NextResponse.json({ error: 'PIN not configured' }, { status: 500 });

  if (!timingSafeEqualPin(parsed.data.pin, pin)) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
  }

  clearAttempts(ip);
  const token = await signAdminToken();
  const res = NextResponse.json({ success: true, expiresInSeconds: 8 * 60 * 60 });
  res.cookies.set(ADMIN_COOKIE_NAME, token, adminCookieOptions());
  return res;
}

export async function DELETE() {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE_NAME, '', { ...adminCookieOptions(), maxAge: 0 });
  return res;
}
