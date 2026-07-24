// Naturelite Manufacturing Cost Tracker — typed errors (spec Appendix B)

export const ERROR_HTTP: Record<string, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  EMPTY_PURCHASE: 400,
  INVALID_QUANTITY: 400,
  UOM_MISMATCH: 400,
  NOTE_REQUIRED: 400,
  INVALID_PURCHASE_ZERO_VALUE: 400,
  ALREADY_POSTED: 409,
  LOT_ALREADY_CONSUMED: 409,
  IMMUTABLE_FIELD: 400,
  LOT_INTEGRITY_ERROR: 500,
  INSUFFICIENT_STOCK: 400,
  DUPLICATE_PRIMARY_OUTPUT: 409,
  YIELD_EXCEEDS_INPUT: 400,
  YIELD_REQUIRED_FIRST: 400,
  NO_OUTPUT_RECORDED: 400,
  INCOMPLETE_BATCH: 422,
  BATCH_FROZEN: 409,
  REASON_REQUIRED: 400,
  DUPLICATE_ACTIVE_RATE: 409,
  DUPLICATE_ACTIVE_BOM: 409,
  PERIOD_LOCKED: 409,
};

export class AppError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;
  extra?: Record<string, unknown>;

  constructor(code: string, message?: string, opts?: { fields?: Record<string, string>; extra?: Record<string, unknown> }) {
    super(message || code);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_HTTP[code] ?? 400;
    this.fields = opts?.fields;
    this.extra = opts?.extra;
  }
}

export function errorResponseBody(err: unknown) {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        success: false,
        error: { code: err.code, message: err.message, fields: err.fields, ...err.extra },
      },
    };
  }
  const message = err instanceof Error ? err.message : 'Unexpected error';
  return { status: 500, body: { success: false, error: { code: 'INTERNAL_ERROR', message } } };
}
