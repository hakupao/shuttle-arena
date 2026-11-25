import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRequestT } from "@/i18n/server";

export const runtime = 'edge';

export async function GET(request: Request) {
  const t = getRequestT(request);
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: t("api.notAuthenticated") },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        playerId: user.playerId,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: t("api.internalError") },
      { status: 500 }
    );
  }
}
