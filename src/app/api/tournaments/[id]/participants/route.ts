import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { tournamentParticipants, tournaments, users, groups } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getRequestT } from "@/i18n/server";

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = getRequestT(request);
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: t("api.adminRequired") }, { status: 403 });
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: t("api.invalidTournamentId") }, { status: 400 });
    }

    const tournament = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!tournament) {
      return NextResponse.json({ error: t("api.tournamentNotFound") }, { status: 404 });
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
      username: userMap.get(p.userId)?.username || t("api.unknown"),
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
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}

// POST: Add or update a participant's position assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = getRequestT(request);
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: t("api.unauthorizedAdmin") }, { status: 403 });
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: t("api.invalidTournamentId") }, { status: 400 });
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
      return NextResponse.json({ error: t("api.tournamentNotFound") }, { status: 404 });
    }

    if (tournament.status === "archived") {
      return NextResponse.json({ error: t("api.archivedFrozen") }, { status: 403 });
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
          { error: t("api.idsMustBeInt") },
          { status: 400 }
        );
      }

      if (gender !== "M" && gender !== "F") {
        return NextResponse.json(
          { error: t("api.genderMustBeMF") },
          { status: 400 }
        );
      }

      if (assignedPosition < 1 || assignedPosition > totalPerGroup) {
        return NextResponse.json(
          { error: t("api.positionRange", { max: totalPerGroup }) },
          { status: 400 }
        );
      }

      const expectedGender = assignedPosition <= tournament.malesPerGroup ? "M" : "F";
      if (gender !== expectedGender) {
        return NextResponse.json(
          { error: t(expectedGender === "M" ? "api.needMale" : "api.needFemale", { pos: assignedPosition }) },
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
        return NextResponse.json({ error: t("api.userMissing", { id: missing }) }, { status: 400 });
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
          { error: t("api.positionFull", { pos, max: groupCount }) },
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
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}

// DELETE: Remove a participant from the tournament
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = getRequestT(request);
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: t("api.unauthorizedAdmin") }, { status: 403 });
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: t("api.invalidTournamentId") }, { status: 400 });
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
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}
