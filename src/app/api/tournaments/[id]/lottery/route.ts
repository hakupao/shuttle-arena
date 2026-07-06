import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { tournamentParticipants, tournaments, groups, players, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

export const runtime = 'edge';

// POST: Run lottery - randomly assign participants to teams based on their position
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const tournament = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status === "archived") {
      return NextResponse.json({ error: "赛事已归档，数据已冻结，不能修改" }, { status: 403 });
    }

    const tournamentGroups = (await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all())
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const tournamentPlayers = await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournamentId))
      .all();

    const participants = await db
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId))
      .all();

    if (participants.length === 0) {
      return NextResponse.json(
        { error: "没有已分配位置的参赛者，请先分配位置" },
        { status: 400 }
      );
    }

    const totalPerGroup = tournament.malesPerGroup + tournament.femalesPerGroup;
    const groupCount = tournamentGroups.length;

    // Group participants by position number
    const byPosition = new Map<number, typeof participants>();
    for (const p of participants) {
      const list = byPosition.get(p.assignedPosition) || [];
      list.push(p);
      byPosition.set(p.assignedPosition, list);
    }

    // Fisher-Yates shuffle
    function shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // Get user info for name assignment
    const allUsers = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .all();
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const assignments: Array<{
      playerId: number;
      userId: number;
      username: string;
      groupName: string;
      position: number;
    }> = [];

    // Collect every write and apply them as ONE atomic D1 batch, so a failure
    // partway through can't leave users unbound-but-not-rebound / a half-drawn
    // lottery. Batch statements run sequentially and see prior statements'
    // effects, so expressing "unbind current holder" as a conditional UPDATE
    // reproduces the original read-modify-write behavior exactly.
    const writes: BatchItem<"sqlite">[] = [];

    // For each position, shuffle participants and assign to groups
    for (let pos = 1; pos <= totalPerGroup; pos++) {
      const posParticipants = byPosition.get(pos) || [];
      const shuffled = shuffle(posParticipants);

      for (let gi = 0; gi < Math.min(shuffled.length, groupCount); gi++) {
        const participant = shuffled[gi];
        const group = tournamentGroups[gi];

        // Find the primary player slot (slotIndex=1) for this group + position
        const playerSlot = tournamentPlayers.find(
          (p) => p.groupId === group.id && p.positionNumber === pos && (p.slotIndex ?? 1) === 1
        );

        if (!playerSlot) continue;

        const user = userMap.get(participant.userId);
        const username = user?.username || "未知";

        // Update player name only if not already set
        if (!playerSlot.name) {
          writes.push(db.update(players).set({ name: username }).where(eq(players.id, playerSlot.id)));
        }

        // Unbind whoever currently holds this slot, then bind the drawn user.
        writes.push(db.update(users).set({ playerId: null }).where(eq(users.playerId, playerSlot.id)));
        writes.push(db.update(users).set({ playerId: playerSlot.id }).where(eq(users.id, participant.userId)));

        assignments.push({
          playerId: playerSlot.id,
          userId: participant.userId,
          username,
          groupName: `${group.icon} ${group.name}`,
          position: pos,
        });
      }
    }

    if (writes.length > 0) {
      await db.batch(writes as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    }

    return NextResponse.json({
      success: true,
      assignments,
      message: `摇号完成！共分配 ${assignments.length} 人`,
    });
  } catch (error) {
    console.error("Lottery error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
