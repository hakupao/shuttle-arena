// Fixed-window login rate limiting, backed by the login_attempts table (D1).
// The decision logic is kept pure here so it can be unit-tested without a DB;
// the login route wires it to reads/writes. Keyed by client IP.

export interface AttemptRow {
  windowStart: number; // unix epoch seconds when the current window began
  attempts: number; // failed attempts counted in the current window
}

export const LOGIN_ATTEMPT_LIMIT = 10;
export const LOGIN_WINDOW_SECONDS = 15 * 60;

// Is this key currently blocked? A window older than windowSeconds has expired
// and no longer counts, so a legitimate user is never locked out permanently.
export function isOverLimit(
  row: AttemptRow | null,
  nowSeconds: number,
  limit: number = LOGIN_ATTEMPT_LIMIT,
  windowSeconds: number = LOGIN_WINDOW_SECONDS
): { limited: boolean; retryAfterSeconds: number } {
  if (!row) return { limited: false, retryAfterSeconds: 0 };
  const elapsed = nowSeconds - row.windowStart;
  if (elapsed >= windowSeconds) return { limited: false, retryAfterSeconds: 0 };
  if (row.attempts >= limit) {
    return { limited: true, retryAfterSeconds: Math.max(1, windowSeconds - elapsed) };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

// The row to persist after a failed attempt: start a fresh window if the old one
// expired (or none existed), otherwise increment within the current window.
export function nextFailureState(
  row: AttemptRow | null,
  nowSeconds: number,
  windowSeconds: number = LOGIN_WINDOW_SECONDS
): AttemptRow {
  if (!row || nowSeconds - row.windowStart >= windowSeconds) {
    return { windowStart: nowSeconds, attempts: 1 };
  }
  return { windowStart: row.windowStart, attempts: row.attempts + 1 };
}
