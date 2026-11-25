import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { normalizePassword, validatePassword } from "@/lib/account-validation";
import { eq } from "drizzle-orm";
import { getRequestT } from "@/i18n/server";

export const runtime = 'edge';

interface UpdateUserRequest {
  password?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = getRequestT(request);
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: t("api.unauthorized") }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: t("api.invalidId") }, { status: 400 });
    }

    const db = getDb();
    const body = await request.json() as UpdateUserRequest;
    const password = normalizePassword(body.password);
    const passwordError = validatePassword(password, t);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!existing) {
      return NextResponse.json({ error: t("api.userNotFound") }, { status: 404 });
    }

    const passwordHash = await hashPassword(password);
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId))
      .run();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = getRequestT(request);
  try {
    const db = getDb();
    const admin = await requireAdmin();
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: t("api.invalidId") }, { status: 400 });
    }

    // Prevent deleting yourself
    if (admin.id === userId) {
      return NextResponse.json({ error: t("api.cannotDeleteSelf") }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!existing) {
      return NextResponse.json({ error: t("api.userNotFound") }, { status: 404 });
    }

    await db.delete(users).where(eq(users.id, userId)).run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: t("api.unauthorized") }, { status: 401 });
    }
    console.error("Delete user error:", error);
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}
