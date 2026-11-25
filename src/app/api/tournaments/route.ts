import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { tournaments, templatePositions, templateMatches, groups, players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getDefaultTeam, buildDefaultTemplate, type ScoringMode } from "@/lib/constants";
import { eq } from "drizzle-orm";
import { getRequestT } from "@/i18n/server";

export const runtime = 'edge';

function isIntegerInRange(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}

interface CreateTournamentBody {
  name?: string;
  courtsCount?: number;
  roundDurationMinutes?: number;
  scoringMode?: ScoringMode;
  eventDate?: string | null;
  startTime?: string;
  endTime?: string;
  malesPerGroup?: number;
  femalesPerGroup?: number;
  groupCount?: number;
}

export async function GET(request: Request) {
  const t = getRequestT(request);
  try {
    const db = getDb();
    const allTournaments = await db.select().from(tournaments).all();
    return NextResponse.json({ tournaments: allTournaments });
  } catch (error) {
    console.error("List tournaments error:", error);
    return NextResponse.json(
      { error: t("api.internalError") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json() as CreateTournamentBody;
    const {
      name,
      courtsCount = 3,
      roundDurationMinutes = 20,
      scoringMode = "single_21",
      eventDate,
      startTime = "09:00",
      endTime = "19:00",
      malesPerGroup = 3,
      femalesPerGroup = 2,
      groupCount = 4,
    } = body;

    if (
      scoringMode !== "single_21" &&
      scoringMode !== "single_30" &&
      scoringMode !== "best_of_3_15" &&
      scoringMode !== "best_of_3_21"
    ) {
      return NextResponse.json(
        { error: t("api.invalidScoringMode") },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: t("api.tournamentNameRequired") },
        { status: 400 }
      );
    }

    if (!isIntegerInRange(courtsCount, 1, 20)) {
      return NextResponse.json(
        { error: t("api.limitCourts") },
        { status: 400 }
      );
    }

    if (!isIntegerInRange(roundDurationMinutes, 5, 120)) {
      return NextResponse.json(
        { error: t("api.limitRoundDuration") },
        { status: 400 }
      );
    }

    if (!isIntegerInRange(malesPerGroup, 1, 10) || !isIntegerInRange(femalesPerGroup, 1, 10)) {
      return NextResponse.json(
        { error: t("api.limitPerGroup") },
        { status: 400 }
      );
    }

    if (!isIntegerInRange(groupCount, 2, 20)) {
      return NextResponse.json(
        { error: t("api.limitGroups") },
        { status: 400 }
      );
    }

    // Create tournament
    const insertResult = await db
      .insert(tournaments)
      .values({
        name: name.trim(),
        courtsCount,
        roundDurationMinutes,
        scoringMode,
        eventDate: eventDate || null,
        startTime,
        endTime,
        malesPerGroup,
        femalesPerGroup,
      })
      .run();

    const tournamentId = Number(insertResult.meta.last_row_id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      throw new Error("Failed to resolve inserted tournament id");
    }

    const tournament = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!tournament) {
      throw new Error("Created tournament not found");
    }

    const defaultTemplate = buildDefaultTemplate(malesPerGroup, femalesPerGroup);

    // Create default template positions
    for (const pos of defaultTemplate.positions) {
      await db.insert(templatePositions)
        .values({
          tournamentId: tournament.id,
          positionNumber: pos.positionNumber,
          gender: pos.gender,
        })
        .run();
    }

    // Create default template matches
    for (const tm of defaultTemplate.matches) {
      await db.insert(templateMatches)
        .values({
          tournamentId: tournament.id,
          matchType: tm.matchType,
          homePos1: tm.homePos1,
          homePos2: tm.homePos2,
          awayPos1: tm.awayPos1,
          awayPos2: tm.awayPos2,
          sortOrder: tm.sortOrder,
        })
        .run();
    }

    // Create groups using default team icons
    for (let i = 0; i < groupCount; i++) {
      const team = getDefaultTeam(i, t);
      await db
        .insert(groups)
        .values({
          tournamentId: tournament.id,
          name: team.name,
          icon: team.icon,
          sortOrder: i,
        })
        .run();
    }

    // Query back the created groups to get their real IDs
    const createdGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournament.id))
      .all();

    // Create player slots for each group
    const totalPerGroup = malesPerGroup + femalesPerGroup;
    for (const group of createdGroups) {
      for (let p = 1; p <= totalPerGroup; p++) {
        await db.insert(players)
          .values({
            tournamentId: tournament.id,
            groupId: group.id,
            positionNumber: p,
            gender: p <= malesPerGroup ? "M" : "F",
          })
          .run();
      }
    }

    return NextResponse.json({ tournament }, { status: 201 });
  } catch (error) {
    console.error("Create tournament error:", error);
    return NextResponse.json(
      { error: t("api.internalError") },
      { status: 500 }
    );
  }
}
