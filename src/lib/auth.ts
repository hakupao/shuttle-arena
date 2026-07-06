import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// No production fallback secret: a misconfigured production deployment must
// fail closed rather than sign/verify tokens with a publicly-known key.
// Resolved lazily (not at module load) so the edge build, which evaluates
// modules without request env, doesn't crash. Outside production a local-only
// fallback keeps `next dev` working without extra setup.
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    return new TextEncoder().encode(secret);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not configured (must be set and at least 16 characters). Refusing to sign or verify tokens in production."
    );
  }
  return new TextEncoder().encode("dev-only-insecure-secret-not-for-production");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hashSync(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compareSync(password, hash);
}

export async function createToken(userId: number, role: string): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as { userId: number; role: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const db = getDb();
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .get();

  return user || null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Login required");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}
