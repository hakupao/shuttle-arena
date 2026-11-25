import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, loginAttempts } from "@/db/schema";
import { verifyPassword, createToken } from "@/lib/auth";
import { isOverLimit, nextFailureState } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { getRequestT } from "@/i18n/server";

export const runtime = 'edge';

interface LoginRequestBody {
  username?: unknown;
  password?: unknown;
}

// A valid bcrypt hash used only to equalize response time when the username
// does not exist, so login timing cannot be used to enumerate usernames.
const DUMMY_PASSWORD_HASH =
  "$2b$10$oVWrt8kuk5dcizHw9RXIjOQc6g/pfehBV14fEYpyvDDq9OgB9bGcq";

// Cloudflare sets cf-connecting-ip to the real client IP (not client-spoofable).
function clientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const t = getRequestT(request);
  try {
    const db = getDb();
    const body = await request.json() as LoginRequestBody;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: t("api.credentialsRequired") },
        { status: 400 }
      );
    }

    // Per-IP fixed-window rate limit: reject once too many failed attempts pile
    // up in the window, before doing any user lookup or password hashing.
    const ip = clientIp(request);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const attemptRow = (await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.ip, ip))
      .get()) ?? null;

    const limit = isOverLimit(attemptRow, nowSeconds);
    if (limit.limited) {
      return NextResponse.json(
        { error: t("api.loginRateLimited") },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const recordFailure = async () => {
      const next = nextFailureState(attemptRow, nowSeconds);
      await db
        .insert(loginAttempts)
        .values({ ip, windowStart: next.windowStart, attempts: next.attempts })
        .onConflictDoUpdate({
          target: loginAttempts.ip,
          set: { windowStart: next.windowStart, attempts: next.attempts },
        })
        .run();
    };

    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user) {
      // Run a dummy comparison so a missing user takes the same time as a
      // wrong password (prevents username enumeration via timing).
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      await recordFailure();
      return NextResponse.json(
        { error: t("api.invalidCredentials") },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await recordFailure();
      return NextResponse.json(
        { error: t("api.invalidCredentials") },
        { status: 401 }
      );
    }

    // Successful login clears the failure counter for this IP.
    await db.delete(loginAttempts).where(eq(loginAttempts.ip, ip)).run();

    const token = await createToken(user.id, user.role);

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        playerId: user.playerId,
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: t("api.internalError") },
      { status: 500 }
    );
  }
}
