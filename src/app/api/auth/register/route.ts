import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, createToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getRequestT } from "@/i18n/server";
import { validatePassword, validateUsername } from "@/lib/account-validation";

export const runtime = 'edge';

interface RegisterRequestBody {
  username?: unknown;
  password?: unknown;
}

export async function POST(request: NextRequest) {
  const t = getRequestT(request);
  try {
    const db = getDb();
    const body = await request.json() as RegisterRequestBody;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: t("api.credentialsRequired") },
        { status: 400 }
      );
    }

    const usernameError = validateUsername(username, t);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 });
    }

    const passwordError = validatePassword(password, t);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Check if username already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (existing) {
      return NextResponse.json(
        { error: t("api.usernameExists") },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    await db
      .insert(users)
      .values({
        username,
        passwordHash,
        role: "athlete",
      })
      .run();

    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!result) {
      throw new Error("Failed to load the newly created user");
    }

    const token = await createToken(result.id, result.role);

    const response = NextResponse.json({
      user: {
        id: result.id,
        username: result.username,
        role: result.role,
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: t("api.internalError") },
      { status: 500 }
    );
  }
}
