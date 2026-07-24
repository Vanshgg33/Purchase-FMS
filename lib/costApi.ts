import { NextResponse } from 'next/server';
import { errorResponseBody } from '@/lib/costErrors';

export function ok(data: unknown, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

export async function ctRoute<T>(fn: () => Promise<T | NextResponse>): Promise<NextResponse> {
  try {
    const result = await fn();
    if (result instanceof NextResponse) return result;
    return ok(result);
  } catch (err) {
    const { status, body } = errorResponseBody(err);
    return NextResponse.json(body, { status });
  }
}
