import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { matches, players, tournaments } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getRequestT } from "@/i18n/server";

export const runtime = 'edge';

type PlayerSlot = "homePlayer1" | "homePlayer2" | "awayPlayer1" | "awayPlayer2";

const SLOT_COLUMN_MAP: Record<PlayerSlot, "homePlayer1Id" | "homePlayer2Id" | "awayPlayer1Id" | "awayPlayer2Id"> = {
  homePlayer1: "homePlayer1Id",
  homePlayer2: "homePlayer2Id",
  awayPlayer1: "awayPlayer1Id",
  awayPlayer2: "awayPlayer2Id",
};

// PATCH: Swap a player in a match to their alternate (same position, different slotIndex)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = getRequestT(request);
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: t("api.unauthorized") }, { status: 403 });
  }

  try {
    const db = getDb();
    const { id } = await params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: t("api.invalidMatchId") }, { status: 400 });
    }

    const body = await request.json() as {
      slot?: string;
      newPlayerId?: number;
    };

    const { slot, newPlayerId } = body;

    if (!slot || !SLOT_COLUMN_MAP[slot as PlayerSlot]) {
      return NextResponse.json(
        { error: "slot must be one of: homePlayer1, homePlayer2, awayPlayer1, awayPlayer2" },
        { status: 400 }
      );
    }

    if (!newPlayerId || typeof newPlayerId !== "number") {
      return NextResponse.json({ error: "newPlayerId is required" }, { status: 400 });
    }

    // Load the match
    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .get();

    if (!match) {
      return NextResponse.json({ error: t("api.matchNotFound") }, { status: 404 });
    }

    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).get();
    if (tournament?.status === "archived") {
      return NextResponse.json({ error: t("api.archivedFrozen") }, { status: 403 });
    }

    if (match.status !== "pending") {
      return NextResponse.json(
        { error: t("api.swapNotStarted") },
        { status: 400 }
      );
    }

    const columnKey = SLOT_COLUMN_MAP[slot as PlayerSlot];
    const currentPlayerId = match[columnKey];

    if (!currentPlayerId) {
      return NextResponse.json({ error: t("api.swapNoPlayer") }, { status: 400 });
    }

    if (currentPlayerId === newPlayerId) {
      return NextResponse.json({ error: t("api.swapSamePlayer") }, { status: 400 });
    }

    // Load both players to verify they share the same (groupId, positionNumber)
    const [currentPlayer, newPlayer] = await Promise.all([
      db.select().from(players).where(eq(players.id, currentPlayerId)).get(),
      db.select().from(players).where(eq(players.id, newPlayerId)).get(),
    ]);

    if (!currentPlayer || !newPlayer) {
      return NextResponse.json({ error: t("api.swapPlayerNotFound") }, { status: 404 });
    }

    if (
      currentPlayer.groupId !== newPlayer.groupId ||
      currentPlayer.positionNumber !== newPlayer.positionNumber
    ) {
      return NextResponse.json(
        { error: t("api.swapSlotMismatch") },
        { status: 400 }
      );
    }

    // Perform the swap
    await db.update(matches)
      .set({ [columnKey]: newPlayerId })
      .where(eq(matches.id, matchId))
      .run();

    // Return updated match
    const updated = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .get();

    return NextResponse.json({ match: updated });
  } catch (error) {
    console.error("Swap player error:", error);
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}
