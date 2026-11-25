import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  tournaments,
  groups,
  players,
  users,
  tournamentParticipants,
  templatePositions,
  templateMatches,
  matches,
  matchGames,
  refereeRecords,
  scoreEvents,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { buildDefaultTemplate, getDefaultTeam } from "@/lib/constants";
import type { ScoringMode } from "@/lib/constants";
import { eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getRequestT } from "@/i18n/server";

export const runtime = 'edge';

function isIntegerInRange(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}

interface UpdateTournamentRequestBody {
  name?: string;
  courtsCount?: number;
  roundDurationMinutes?: number;
  scoringMode?: ScoringMode;
  deuceEnabled?: boolean;
  eventDate?: string | null;
  startTime?: string;
  endTime?: string;
  malesPerGroup?: number;
  femalesPerGroup?: number;
  groupCount?: number;
  status?: "draft" | "active" | "finished" | "archived";
}

// Build (not execute) the statements that delete a tournament's matches and
// their dependent records. Subqueries avoid a huge IN-list that would blow past
// D1's per-query bound-parameter limit. Callers run these inside a db.batch so
// the whole cascade is atomic (all-or-nothing).
function matchDeleteStatements(
  db: ReturnType<typeof getDb>,
  tournamentId: number
): BatchItem<"sqlite">[] {
  const matchIds = db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId));
  return [
    db.delete(scoreEvents).where(inArray(scoreEvents.matchId, matchIds)),
    db.delete(refereeRecords).where(inArray(refereeRecords.matchId, matchIds)),
    db.delete(matchGames).where(inArray(matchGames.matchId, matchIds)),
    db.delete(matches).where(eq(matches.tournamentId, tournamentId)),
  ];
}

function dependencyDeleteStatements(
  db: ReturnType<typeof getDb>,
  tournamentId: number
): BatchItem<"sqlite">[] {
  const playerIds = db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.tournamentId, tournamentId));
  return [
    ...matchDeleteStatements(db, tournamentId),
    db.update(users).set({ playerId: null }).where(inArray(users.playerId, playerIds)),
    db.delete(tournamentParticipants).where(eq(tournamentParticipants.tournamentId, tournamentId)),
    db.delete(players).where(eq(players.tournamentId, tournamentId)),
    db.delete(groups).where(eq(groups.tournamentId, tournamentId)),
    db.delete(templateMatches).where(eq(templateMatches.tournamentId, tournamentId)),
    db.delete(templatePositions).where(eq(templatePositions.tournamentId, tournamentId)),
  ];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = getRequestT(request);
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

    const tournamentGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all();

    const tournamentPlayers = await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournamentId))
      .all();

    const positions = await db
      .select()
      .from(templatePositions)
      .where(eq(templatePositions.tournamentId, tournamentId))
      .all();

    const templates = await db
      .select()
      .from(templateMatches)
      .where(eq(templateMatches.tournamentId, tournamentId))
      .all();

    // Enrich players with bound username
    const allUsers = await db
      .select({ id: users.id, username: users.username, playerId: users.playerId })
      .from(users)
      .all();
    const userByPlayerId = new Map(
      allUsers.filter((u) => u.playerId).map((u) => [u.playerId, u])
    );
    const enrichedPlayers = tournamentPlayers.map((p) => {
      const boundUser = userByPlayerId.get(p.id);
      return { ...p, boundUsername: boundUser?.username || null };
    });

    return NextResponse.json({
      tournament,
      groups: tournamentGroups,
      players: enrichedPlayers,
      template: {
        positions,
        matches: templates,
      },
    });
  } catch (error) {
    console.error("Get tournament error:", error);
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = getRequestT(request);
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json(
      { error: t("api.unauthorizedAdmin") },
      { status: 403 }
    );
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: t("api.invalidTournamentId") }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!existing) {
      return NextResponse.json({ error: t("api.tournamentNotFound") }, { status: 404 });
    }

    const body = await request.json() as UpdateTournamentRequestBody;
    const {
      name,
      courtsCount,
      roundDurationMinutes,
      scoringMode,
      deuceEnabled,
      eventDate,
      startTime,
      endTime,
      malesPerGroup,
      femalesPerGroup,
      groupCount,
      status,
    } = body;

    if (
      scoringMode !== undefined &&
      scoringMode !== "single_21" &&
      scoringMode !== "single_30" &&
      scoringMode !== "best_of_3_15" &&
      scoringMode !== "best_of_3_21"
    ) {
      return NextResponse.json({ error: t("api.invalidScoringMode") }, { status: 400 });
    }

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ error: t("api.tournamentNameRequired") }, { status: 400 });
    }

    if (courtsCount !== undefined && !isIntegerInRange(courtsCount, 1, 20)) {
      return NextResponse.json({ error: t("api.limitCourts") }, { status: 400 });
    }

    if (roundDurationMinutes !== undefined && !isIntegerInRange(roundDurationMinutes, 5, 120)) {
      return NextResponse.json({ error: t("api.limitRoundDuration") }, { status: 400 });
    }

    if (malesPerGroup !== undefined && !isIntegerInRange(malesPerGroup, 1, 10)) {
      return NextResponse.json({ error: t("api.limitMales") }, { status: 400 });
    }

    if (femalesPerGroup !== undefined && !isIntegerInRange(femalesPerGroup, 1, 10)) {
      return NextResponse.json({ error: t("api.limitFemales") }, { status: 400 });
    }

    if (groupCount !== undefined && !isIntegerInRange(groupCount, 2, 20)) {
      return NextResponse.json({ error: t("api.limitGroups") }, { status: 400 });
    }

    if (
      status !== undefined &&
      status !== "draft" &&
      status !== "active" &&
      status !== "finished" &&
      status !== "archived"
    ) {
      return NextResponse.json({ error: t("api.invalidTournamentStatus") }, { status: 400 });
    }

    // Archived tournaments are frozen — only allow status change (to unarchive)
    if (existing.status === "archived" && status === undefined) {
      return NextResponse.json({ error: t("api.archivedFrozen") }, { status: 403 });
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (courtsCount !== undefined) updateData.courtsCount = courtsCount;
    if (roundDurationMinutes !== undefined) updateData.roundDurationMinutes = roundDurationMinutes;
    if (scoringMode !== undefined) updateData.scoringMode = scoringMode;
    if (deuceEnabled !== undefined) updateData.deuceEnabled = deuceEnabled;
    if (eventDate !== undefined) updateData.eventDate = eventDate;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (malesPerGroup !== undefined) updateData.malesPerGroup = malesPerGroup;
    if (femalesPerGroup !== undefined) updateData.femalesPerGroup = femalesPerGroup;
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date().toISOString();

    await db
      .update(tournaments)
      .set(updateData)
      .where(eq(tournaments.id, tournamentId))
      .run();

    const updated = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!updated) {
      throw new Error("Updated tournament not found");
    }

    const currentGroups = (await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all())
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const nextGroupCount = groupCount ?? currentGroups.length;
    const nextMalesPerGroup = malesPerGroup ?? updated.malesPerGroup;
    const nextFemalesPerGroup = femalesPerGroup ?? updated.femalesPerGroup;
    const groupCountChanged = currentGroups.length !== nextGroupCount;
    const rosterShapeChanged =
      existing.malesPerGroup !== nextMalesPerGroup ||
      existing.femalesPerGroup !== nextFemalesPerGroup;

    if (groupCountChanged || rosterShapeChanged) {
      const totalPerGroup = nextMalesPerGroup + nextFemalesPerGroup;

      // Phase 1 (atomic): delete matches + players (and participants/groups when
      // applicable), and recreate the groups when the group count changes.
      // Groups must be inserted here so their auto-generated ids exist before we
      // insert players that reference them (D1 batches can't read ids mid-batch).
      const phase1: BatchItem<"sqlite">[] = [...matchDeleteStatements(db, tournamentId)];
      if (rosterShapeChanged) {
        phase1.push(
          db.delete(tournamentParticipants).where(eq(tournamentParticipants.tournamentId, tournamentId))
        );
      }
      phase1.push(
        db.update(users).set({ playerId: null }).where(
          inArray(
            users.playerId,
            db.select({ id: players.id }).from(players).where(eq(players.tournamentId, tournamentId))
          )
        ),
        db.delete(players).where(eq(players.tournamentId, tournamentId))
      );

      let groupsForPlayers = currentGroups;
      if (groupCountChanged) {
        phase1.push(db.delete(groups).where(eq(groups.tournamentId, tournamentId)));
        for (let i = 0; i < nextGroupCount; i++) {
          const existingGroup = currentGroups[i];
          const fallbackTeam = getDefaultTeam(i, t);
          phase1.push(
            db.insert(groups).values({
              tournamentId,
              name: existingGroup?.name || fallbackTeam.name,
              icon: existingGroup?.icon || fallbackTeam.icon,
              sortOrder: i,
            })
          );
        }
      }

      await db.batch(phase1 as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);

      if (groupCountChanged) {
        groupsForPlayers = (await db
          .select()
          .from(groups)
          .where(eq(groups.tournamentId, tournamentId))
          .all())
          .sort((a, b) => a.sortOrder - b.sortOrder);
      }

      // Phase 2 (atomic): insert players for the now-known group ids, plus the
      // default template when the roster shape changed. Player inserts are
      // chunked so no single INSERT exceeds D1's per-query bound-parameter limit.
      const playerRows: { tournamentId: number; groupId: number; positionNumber: number; gender: "M" | "F" }[] = [];
      for (const group of groupsForPlayers) {
        for (let position = 1; position <= totalPerGroup; position++) {
          playerRows.push({
            tournamentId,
            groupId: group.id,
            positionNumber: position,
            gender: position <= nextMalesPerGroup ? "M" : "F",
          });
        }
      }

      const phase2: BatchItem<"sqlite">[] = [];
      const PLAYER_CHUNK = 20; // 20 rows x 4 cols = 80 bound params, under D1's 100 limit
      for (let i = 0; i < playerRows.length; i += PLAYER_CHUNK) {
        phase2.push(db.insert(players).values(playerRows.slice(i, i + PLAYER_CHUNK)));
      }

      if (rosterShapeChanged) {
        const defaultTemplate = buildDefaultTemplate(nextMalesPerGroup, nextFemalesPerGroup);
        phase2.push(
          db.delete(templateMatches).where(eq(templateMatches.tournamentId, tournamentId)),
          db.delete(templatePositions).where(eq(templatePositions.tournamentId, tournamentId))
        );
        for (const position of defaultTemplate.positions) {
          phase2.push(
            db.insert(templatePositions).values({
              tournamentId,
              positionNumber: position.positionNumber,
              gender: position.gender,
            })
          );
        }
        for (const match of defaultTemplate.matches) {
          phase2.push(
            db.insert(templateMatches).values({
              tournamentId,
              matchType: match.matchType,
              homePos1: match.homePos1,
              homePos2: match.homePos2,
              awayPos1: match.awayPos1,
              awayPos2: match.awayPos2,
              sortOrder: match.sortOrder,
            })
          );
        }
      }

      if (phase2.length > 0) {
        await db.batch(phase2 as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
      }
    }

    return NextResponse.json({ tournament: updated });
  } catch (error) {
    console.error("Update tournament error:", error);
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = getRequestT(request);
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json(
      { error: t("api.unauthorizedAdmin") },
      { status: 403 }
    );
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: t("api.invalidTournamentId") }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!existing) {
      return NextResponse.json({ error: t("api.tournamentNotFound") }, { status: 404 });
    }

    if (existing.status === "archived") {
      return NextResponse.json({ error: t("api.archivedNoDelete") }, { status: 403 });
    }

    const deleteWrites: BatchItem<"sqlite">[] = [
      ...dependencyDeleteStatements(db, tournamentId),
      db.delete(tournaments).where(eq(tournaments.id, tournamentId)),
    ];
    await db.batch(deleteWrites as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tournament error:", error);
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}
