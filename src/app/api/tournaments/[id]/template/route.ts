import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  templatePositions,
  templateMatches,
  tournaments,
  matches as tournamentMatches,
  matchGames,
  refereeRecords,
  scoreEvents,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getRequestT } from "@/i18n/server";

export const runtime = 'edge';

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

    const positions = await db
      .select()
      .from(templatePositions)
      .where(eq(templatePositions.tournamentId, tournamentId))
      .all();

    const matches = (await db
      .select()
      .from(templateMatches)
      .where(eq(templateMatches.tournamentId, tournamentId))
      .all())
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return NextResponse.json({ positions, matches });
  } catch (error) {
    console.error("Get template error:", error);
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

    const body = await request.json() as {
      positions?: Array<{ positionNumber?: number; gender?: string }>;
      matches?: Array<{
        matchType?: string;
        homePos1?: number;
        homePos2?: number;
        awayPos1?: number;
        awayPos2?: number;
      }>;
    };
    const { positions, matches } = body;

    if (!Array.isArray(positions) || !Array.isArray(matches)) {
      return NextResponse.json(
        { error: "positions and matches must be arrays" },
        { status: 400 }
      );
    }

    const totalPositions = tournament.malesPerGroup + tournament.femalesPerGroup;
    if (positions.length !== totalPositions) {
      return NextResponse.json(
        { error: t("api.templatePositionCount", { n: totalPositions }) },
        { status: 400 }
      );
    }

    const validatedPositions: Array<{ positionNumber: number; gender: "M" | "F" }> = [];
    const positionGenderMap = new Map<number, "M" | "F">();
    for (const pos of positions) {
      if (
        typeof pos.positionNumber !== "number" ||
        !pos.positionNumber ||
        (pos.gender !== "M" && pos.gender !== "F")
      ) {
        return NextResponse.json(
          { error: "Each position needs positionNumber and gender (M/F)" },
          { status: 400 }
        );
      }

      if (pos.positionNumber < 1 || pos.positionNumber > totalPositions) {
        return NextResponse.json(
          { error: t("api.positionRange", { max: totalPositions }) },
          { status: 400 }
        );
      }

      if (positionGenderMap.has(pos.positionNumber)) {
        return NextResponse.json(
          { error: t("api.templatePositionDup", { pos: pos.positionNumber }) },
          { status: 400 }
        );
      }

      const expectedGender = pos.positionNumber <= tournament.malesPerGroup ? "M" : "F";
      if (pos.gender !== expectedGender) {
        return NextResponse.json(
          { error: t("api.templatePositionGender", { pos: pos.positionNumber, gender: expectedGender }) },
          { status: 400 }
        );
      }

      validatedPositions.push({
        positionNumber: pos.positionNumber,
        gender: pos.gender,
      });
      positionGenderMap.set(pos.positionNumber, pos.gender);
    }

    const validatedMatches: Array<{
      matchType: "MD" | "WD" | "XD";
      homePos1: number;
      homePos2: number;
      awayPos1: number;
      awayPos2: number;
    }> = [];

    const validTypes = ["MD", "WD", "XD"];
    for (const m of matches) {
      if (
        !m.matchType ||
        !validTypes.includes(m.matchType) ||
        typeof m.homePos1 !== "number" ||
        typeof m.homePos2 !== "number" ||
        typeof m.awayPos1 !== "number" ||
        typeof m.awayPos2 !== "number" ||
        !m.homePos1 ||
        !m.homePos2 ||
        !m.awayPos1 ||
        !m.awayPos2
      ) {
        return NextResponse.json(
          { error: `Each match needs matchType, homePos1, homePos2, awayPos1, awayPos2` },
          { status: 400 }
        );
      }

      validatedMatches.push({
        matchType: m.matchType as "MD" | "WD" | "XD",
        homePos1: m.homePos1,
        homePos2: m.homePos2,
        awayPos1: m.awayPos1,
        awayPos2: m.awayPos2,
      });
    }

    for (const match of validatedMatches) {
      const matchPositions = [
        match.homePos1,
        match.homePos2,
        match.awayPos1,
        match.awayPos2,
      ];

      if (matchPositions.some((position) => !positionGenderMap.has(position))) {
        return NextResponse.json(
          { error: t("api.templateRefMissing") },
          { status: 400 }
        );
      }

      if (match.homePos1 === match.homePos2 || match.awayPos1 === match.awayPos2) {
        return NextResponse.json(
          { error: t("api.templateSideDup") },
          { status: 400 }
        );
      }

      const homeGenders = [
        positionGenderMap.get(match.homePos1),
        positionGenderMap.get(match.homePos2),
      ];
      const awayGenders = [
        positionGenderMap.get(match.awayPos1),
        positionGenderMap.get(match.awayPos2),
      ];

      if (
        match.matchType === "MD" &&
        [...homeGenders, ...awayGenders].some((gender) => gender !== "M")
      ) {
        return NextResponse.json(
          { error: t("api.templateMensOnly") },
          { status: 400 }
        );
      }

      if (
        match.matchType === "WD" &&
        [...homeGenders, ...awayGenders].some((gender) => gender !== "F")
      ) {
        return NextResponse.json(
          { error: t("api.templateWomensOnly") },
          { status: 400 }
        );
      }

      if (
        match.matchType === "XD" &&
        (new Set(homeGenders).size !== 2 || new Set(awayGenders).size !== 2)
      ) {
        return NextResponse.json(
          { error: t("api.templateMixedPair") },
          { status: 400 }
        );
      }
    }

    // Template changes invalidate the generated schedule. Apply the whole
    // replace (delete schedule + old template, insert new template) as ONE
    // atomic D1 batch so a mid-operation failure can't leave the tournament with
    // no template. Match-child deletes use a subquery to avoid a huge IN list.
    const scheduledMatchIds = db
      .select({ id: tournamentMatches.id })
      .from(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, tournamentId));

    const writes: BatchItem<"sqlite">[] = [
      db.delete(scoreEvents).where(inArray(scoreEvents.matchId, scheduledMatchIds)),
      db.delete(refereeRecords).where(inArray(refereeRecords.matchId, scheduledMatchIds)),
      db.delete(matchGames).where(inArray(matchGames.matchId, scheduledMatchIds)),
      db.delete(tournamentMatches).where(eq(tournamentMatches.tournamentId, tournamentId)),
      db.delete(templateMatches).where(eq(templateMatches.tournamentId, tournamentId)),
      db.delete(templatePositions).where(eq(templatePositions.tournamentId, tournamentId)),
    ];

    for (const pos of validatedPositions) {
      writes.push(
        db.insert(templatePositions).values({
          tournamentId,
          positionNumber: pos.positionNumber,
          gender: pos.gender,
        })
      );
    }

    for (let i = 0; i < validatedMatches.length; i++) {
      const m = validatedMatches[i];
      writes.push(
        db.insert(templateMatches).values({
          tournamentId,
          matchType: m.matchType,
          homePos1: m.homePos1,
          homePos2: m.homePos2,
          awayPos1: m.awayPos1,
          awayPos2: m.awayPos2,
          sortOrder: i + 1,
        })
      );
    }

    await db.batch(writes as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);

    // Query back inserted data
    const insertedPositions = await db
      .select()
      .from(templatePositions)
      .where(eq(templatePositions.tournamentId, tournamentId))
      .all();

    const insertedMatches = await db
      .select()
      .from(templateMatches)
      .where(eq(templateMatches.tournamentId, tournamentId))
      .all();

    return NextResponse.json({
      positions: insertedPositions,
      matches: insertedMatches,
    });
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}
