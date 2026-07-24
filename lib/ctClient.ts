'use client';

export class CtClientError extends Error {
  code: string;
  fields?: Record<string, string>;
  extra?: Record<string, unknown>;
  constructor(code: string, message: string, fields?: Record<string, string>, extra?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.fields = fields;
    this.extra = extra;
  }
}

export async function ctFetch<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const err = body.error || {};
    throw new CtClientError(err.code || 'UNKNOWN', err.message || 'Request failed', err.fields, err);
  }
  return body.data as T;
}
