import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { tournamentParticipants, tournaments, users, groups } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

export const runtime = 'edge';

interface ParticipantAssignmentInput {
  userId: number;
  assignedPosition: number;
  gender: "M" | "F";
}

interface ParticipantAssignmentsRequest {
  assignments?: ParticipantAssignmentInput[];
}

// GET: List all participants for a tournament (with their assigned positions)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
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

    // Get all participants with user info
    const allParticipants = await db
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId))
      .all();

    const allUsers = await db
      .select({ id: users.id, username: users.username, role: users.role })
      .from(users)
      .all();

    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const enriched = allParticipants.map((p) => ({
      ...p,
      username: userMap.get(p.userId)?.username || "未知",
    }));

    // Calculate position limits: each position can have at most groupCount people
    const tournamentGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all();

    return NextResponse.json({
      participants: enriched,
      malesPerGroup: tournament.malesPerGroup,
      femalesPerGroup: tournament.femalesPerGroup,
      groupCount: tournamentGroups.length,
    });
  } catch (error) {
    console.error("Get participants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add or update a participant's position assignment
export async function POST(
  request: NextRequest,
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

    const body = await request.json() as ParticipantAssignmentsRequest;
    const { assignments } = body;

    if (!Array.isArray(assignments)) {
      return NextResponse.json(
        { error: "assignments must be an array of {userId, assignedPosition, gender}" },
        { status: 400 }
      );
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

    const tournamentGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all();

    const groupCount = tournamentGroups.length;
    const totalPerGroup = tournament.malesPerGroup + tournament.femalesPerGroup;

    // 1) Validate the ENTIRE batch before writing anything, so a bad row late
    //    in the list can't leave earlier rows already committed (was: partial
    //    apply + 400). Also enforce integer types (untrusted JSON): a string
    //    position previously slipped past every range check and corrupted data.
    const validated: { userId: number; assignedPosition: number; gender: "M" | "F" }[] = [];
    for (const { userId, assignedPosition, gender } of assignments) {
      if (!Number.isInteger(userId) || !Number.isInteger(assignedPosition)) {
        return NextResponse.json(
          { error: "userId 与 assignedPosition 必须是整数" },
          { status: 400 }
        );
      }

      if (gender !== "M" && gender !== "F") {
        return NextResponse.json(
          { error: "性别必须为 M 或 F" },
          { status: 400 }
        );
      }

      if (assignedPosition < 1 || assignedPosition > totalPerGroup) {
        return NextResponse.json(
          { error: `位置号必须在 1-${totalPerGroup} 之间` },
          { status: 400 }
        );
      }

      const expectedGender = assignedPosition <= tournament.malesPerGroup ? "M" : "F";
      if (gender !== expectedGender) {
        return NextResponse.json(
          { error: `位置 ${assignedPosition} 需要 ${expectedGender === "M" ? "男" : "女"}子选手` },
          { status: 400 }
        );
      }

      validated.push({ userId, assignedPosition, gender });
    }

    // 2) Every referenced user must exist.
    const userIds = [...new Set(validated.map((a) => a.userId))];
    if (userIds.length > 0) {
      const existingUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, userIds))
        .all();
      const existingUserIds = new Set(existingUsers.map((u) => u.id));
      const missing = userIds.find((uid) => !existingUserIds.has(uid));
      if (missing !== undefined) {
        return NextResponse.json({ error: `用户 ${missing} 不存在` }, { status: 400 });
      }
    }

    // 3) Capacity check on the RESULTING distribution (each position <= groupCount),
    //    computed in memory so it accounts for every move in this batch at once.
    const currentParticipants = await db
      .select({ userId: tournamentParticipants.userId, assignedPosition: tournamentParticipants.assignedPosition })
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId))
      .all();
    const finalUserPosition = new Map<number, number>();
    for (const p of currentParticipants) finalUserPosition.set(p.userId, p.assignedPosition);
    for (const a of validated) finalUserPosition.set(a.userId, a.assignedPosition);
    const positionCount = new Map<number, number>();
    for (const pos of finalUserPosition.values()) {
      positionCount.set(pos, (positionCount.get(pos) || 0) + 1);
    }
    for (const [pos, count] of positionCount) {
      if (count > groupCount) {
        return NextResponse.json(
          { error: `位置 ${pos} 已满（上限 ${groupCount} 人）` },
          { status: 400 }
        );
      }
    }

    // 4) Apply all upserts as ONE atomic batch (all-or-nothing).
    const writes: BatchItem<"sqlite">[] = [];
    for (const a of validated) {
      writes.push(
        db.delete(tournamentParticipants).where(
          and(
            eq(tournamentParticipants.tournamentId, tournamentId),
            eq(tournamentParticipants.userId, a.userId)
          )
        )
      );
      writes.push(
        db.insert(tournamentParticipants).values({
          tournamentId,
          userId: a.userId,
          assignedPosition: a.assignedPosition,
          gender: a.gender,
        })
      );
    }
    if (writes.length > 0) {
      await db.batch(writes as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assign participants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a participant from the tournament
export async function DELETE(
  request: NextRequest,
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

    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get("userId") || "", 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    await db.delete(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, userId)
        )
      )
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove participant error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
