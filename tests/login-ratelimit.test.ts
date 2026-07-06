import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isOverLimit, nextFailureState, LOGIN_ATTEMPT_LIMIT } from "../src/lib/rate-limit";

// End-to-end-ish check of the login limiter: drives the real login_attempts
// table (from schema.sql) through the exact read -> decide -> upsert/delete flow
// the login route uses, and asserts the block kicks in and clears on success.

const SCHEMA = readFileSync(fileURLToPath(new URL("../schema.sql", import.meta.url)), "utf8");
const IP = "203.0.113.7";
const NOW = 1_700_000_000;

let db: DatabaseSync;

const readRow = () => {
  const r = db.prepare(`SELECT window_start as windowStart, attempts FROM login_attempts WHERE ip = ?`).get(IP) as
    | { windowStart: number; attempts: number }
    | undefined;
  return r ?? null;
};
// Mirrors the route's onConflictDoUpdate(next).
const recordFailure = (now: number) => {
  const next = nextFailureState(readRow(), now);
  db.prepare(
    `INSERT INTO login_attempts (ip, window_start, attempts) VALUES (?, ?, ?)
     ON CONFLICT(ip) DO UPDATE SET window_start = excluded.window_start, attempts = excluded.attempts`
  ).run(IP, next.windowStart, next.attempts);
};
const clear = () => db.prepare(`DELETE FROM login_attempts WHERE ip = ?`).run(IP);

beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
});

describe("login rate limiter against the real schema", () => {
  it("allows up to the limit, then blocks with a Retry-After", () => {
    for (let i = 0; i < LOGIN_ATTEMPT_LIMIT; i++) {
      expect(isOverLimit(readRow(), NOW).limited, `attempt ${i + 1} should be allowed`).toBe(false);
      recordFailure(NOW);
    }
    const blocked = isOverLimit(readRow(), NOW);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("a successful login clears the counter for that IP", () => {
    for (let i = 0; i < LOGIN_ATTEMPT_LIMIT; i++) recordFailure(NOW);
    expect(isOverLimit(readRow(), NOW).limited).toBe(true);
    clear(); // success path
    expect(readRow()).toBeNull();
    expect(isOverLimit(readRow(), NOW).limited).toBe(false);
  });

  it("upsert keeps a single row per IP", () => {
    for (let i = 0; i < 5; i++) recordFailure(NOW);
    const count = db.prepare(`SELECT COUNT(*) c FROM login_attempts WHERE ip = ?`).get(IP) as { c: number };
    expect(count.c).toBe(1);
    expect(readRow()).toEqual({ windowStart: NOW, attempts: 5 });
  });
});
