import { describe, it, expect } from "vitest";
import {
  isOverLimit,
  nextFailureState,
  LOGIN_ATTEMPT_LIMIT,
  LOGIN_WINDOW_SECONDS,
} from "./rate-limit";

const NOW = 1_000_000; // arbitrary fixed "now" in epoch seconds

describe("isOverLimit", () => {
  it("is not limited when there is no prior attempt row", () => {
    expect(isOverLimit(null, NOW).limited).toBe(false);
  });

  it("is not limited below the attempt limit", () => {
    expect(isOverLimit({ windowStart: NOW, attempts: LOGIN_ATTEMPT_LIMIT - 1 }, NOW).limited).toBe(false);
  });

  it("is limited once attempts reach the limit within the window", () => {
    const r = isOverLimit({ windowStart: NOW, attempts: LOGIN_ATTEMPT_LIMIT }, NOW);
    expect(r.limited).toBe(true);
    expect(r.retryAfterSeconds).toBe(LOGIN_WINDOW_SECONDS);
  });

  it("reports a shrinking Retry-After as the window elapses", () => {
    const elapsed = 100;
    const r = isOverLimit({ windowStart: NOW - elapsed, attempts: LOGIN_ATTEMPT_LIMIT }, NOW);
    expect(r.limited).toBe(true);
    expect(r.retryAfterSeconds).toBe(LOGIN_WINDOW_SECONDS - elapsed);
  });

  it("is NOT limited once the window has fully elapsed (no permanent lockout)", () => {
    const r = isOverLimit({ windowStart: NOW - LOGIN_WINDOW_SECONDS, attempts: 999 }, NOW);
    expect(r.limited).toBe(false);
  });
});

describe("nextFailureState", () => {
  it("starts a fresh window at attempt 1 when there is no row", () => {
    expect(nextFailureState(null, NOW)).toEqual({ windowStart: NOW, attempts: 1 });
  });

  it("increments within an active window, keeping the window start", () => {
    expect(nextFailureState({ windowStart: NOW - 60, attempts: 3 }, NOW)).toEqual({ windowStart: NOW - 60, attempts: 4 });
  });

  it("resets to a new window when the old one has expired", () => {
    expect(nextFailureState({ windowStart: NOW - LOGIN_WINDOW_SECONDS, attempts: 9 }, NOW)).toEqual({ windowStart: NOW, attempts: 1 });
  });

  it("crosses the limit exactly at the configured attempt count", () => {
    // simulate LIMIT consecutive failures from empty, then verify it is blocked
    let row = null as { windowStart: number; attempts: number } | null;
    for (let i = 0; i < LOGIN_ATTEMPT_LIMIT; i++) {
      expect(isOverLimit(row, NOW).limited).toBe(false); // each attempt allowed up to the limit
      row = nextFailureState(row, NOW);
    }
    expect(isOverLimit(row, NOW).limited).toBe(true); // the (limit+1)-th is blocked
  });
});
