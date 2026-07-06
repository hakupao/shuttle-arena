import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

interface LoginRequestBody {
  username?: unknown;
  password?: unknown;
}

// A valid bcrypt hash used only to equalize response time when the username
// does not exist, so login timing cannot be used to enumerate usernames.
const DUMMY_PASSWORD_HASH =
  "$2b$10$oVWrt8kuk5dcizHw9RXIjOQc6g/pfehBV14fEYpyvDDq9OgB9bGcq";

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json() as LoginRequestBody;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user) {
      // Run a dummy comparison so a missing user takes the same time as a
      // wrong password (prevents username enumeration via timing).
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
