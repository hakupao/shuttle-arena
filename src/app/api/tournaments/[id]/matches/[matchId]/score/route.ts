import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { matches, matchGames, refereeRecords, scoreEvents, tournaments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { SCORING_MODES, type ScoringMode } from "@/lib/constants";
import { buildScoredGames, MAX_SCORE_EVENTS } from "@/lib/score-validation";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getRequestT } from "@/i18n/server";

export const runtime = 'edge';

interface ScoreGameInput {
  homeScore?: unknown;
  awayScore?: unknown;
}

interface ScoreEventInput {
  gameNumber?: unknown;
  eventOrder?: unknown;
  scoringSide?: unknown;
  homeScore?: unknown;
  awayScore?: unknown;
  timestamp?: unknown;
}

interface ScoreRequestBody {
  games?: ScoreGameInput[];
  refereePlayerId?: unknown;
  lineJudgePlayerId?: unknown;
  scoreEventLog?: ScoreEventInput[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const t = getRequestT(request);
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: t("api.scoreLoginRequired") },
        { status: 401 }
      );
    }
    const db = getDb();
    const { id, matchId: matchIdStr } = await params;
    const tournamentId = parseInt(id, 10);
    const matchId = parseInt(matchIdStr, 10);

    if (isNaN(tournamentId) || isNaN(matchId)) {
      return NextResponse.json({ error: t("api.invalidId") }, { status: 400 });
    }

    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .get();

    if (!match || match.tournamentId !== tournamentId) {
      return NextResponse.json({ error: t("api.matchNotFound") }, { status: 404 });
    }

    // Block all scoring for archived tournaments
    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get();
    if (tournament?.status === "archived") {
      return NextResponse.json({ error: t("api.archivedFrozen") }, { status: 403 });
    }

    const isAdmin = user.role === "admin";

    // Authorization: only admins or bound players (participants / referees /
    // line judges are all bound players in this tournament) may submit scores.
    // Logged-in spectator accounts with no player binding cannot.
    if (!isAdmin && user.playerId == null) {
      return NextResponse.json(
        { error: t("api.scoreAdminOrPlayer") },
        { status: 403 }
      );
    }

    if (match.status === "finished" && !isAdmin) {
      return NextResponse.json(
        { error: t("api.scoreAlreadySubmitted") },
        { status: 403 }
      );
    }

    const body = await request.json() as ScoreRequestBody;
    const games = body.games;
    const refereePlayerId =
      typeof body.refereePlayerId === "number" ? body.refereePlayerId : undefined;
    const lineJudgePlayerId =
      typeof body.lineJudgePlayerId === "number" ? body.lineJudgePlayerId : undefined;
    const scoreEventLog = Array.isArray(body.scoreEventLog) ? body.scoreEventLog : [];

    // Scoring mode governs how many games are allowed and the score bounds.
    const scoringMode = (tournament?.scoringMode || "single_21") as ScoringMode;
    const scoringInfo = SCORING_MODES[scoringMode] ?? SCORING_MODES.single_21;

    if (scoreEventLog.length > MAX_SCORE_EVENTS) {
      return NextResponse.json(
        { error: t("api.scoreTooManyEvents") },
        { status: 400 }
      );
    }

    if (!isAdmin) {
      const claimedIds = [refereePlayerId, lineJudgePlayerId].filter(
        (playerId): playerId is number => typeof playerId === "number"
      );

      if (claimedIds.length > 0 && !user) {
        return NextResponse.json(
          { error: t("api.scoreAnonymousReferee") },
          { status: 401 }
        );
      }

      if (claimedIds.length > 0 && !user?.playerId) {
        return NextResponse.json(
          { error: t("api.scoreNoLinkedPlayer") },
          { status: 400 }
        );
      }

      if (claimedIds.some((playerId) => playerId !== user?.playerId)) {
        return NextResponse.json(
          { error: t("api.scoreOwnRefereeOnly") },
          { status: 403 }
        );
      }
    }

    // Validate scores + derive per-game and match winners. Pure and unit-tested
    // in score-validation.test.ts.
    const scored = buildScoredGames(games, scoringInfo.games, t);
    if (!scored.ok) {
      return NextResponse.json({ error: scored.error }, { status: 400 });
    }
    const gameRows = scored.gameRows;
    const matchWinner = scored.matchWinner;

    // Apply every write as ONE atomic D1 batch. Previously this was a sequence of
    // independent statements, so a mid-sequence failure could leave the match
    // 'finished' with missing or partial games; D1 batches are transactional.
    const nowIso = new Date().toISOString();

    // Only keep well-formed timeline events (skip malformed ones).
    const validEvents = scoreEventLog.filter(
      (evt) =>
        typeof evt.gameNumber === "number" &&
        typeof evt.eventOrder === "number" &&
        (evt.scoringSide === "home" || evt.scoringSide === "away") &&
        typeof evt.homeScore === "number" &&
        typeof evt.awayScore === "number"
    );

    const writes: BatchItem<"sqlite">[] = [
      db.delete(matchGames).where(eq(matchGames.matchId, matchId)),
      db.delete(refereeRecords).where(eq(refereeRecords.matchId, matchId)),
      db.delete(scoreEvents).where(eq(scoreEvents.matchId, matchId)),
      ...gameRows.map((row) => db.insert(matchGames).values({ matchId, ...row })),
      db
        .update(matches)
        .set({ status: "finished", winner: matchWinner, updatedAt: nowIso })
        .where(eq(matches.id, matchId)),
    ];

    if (refereePlayerId && typeof refereePlayerId === "number") {
      writes.push(
        db.insert(refereeRecords).values({ matchId, playerId: refereePlayerId, role: "referee" })
      );
    }
    if (lineJudgePlayerId && typeof lineJudgePlayerId === "number") {
      writes.push(
        db.insert(refereeRecords).values({ matchId, playerId: lineJudgePlayerId, role: "line_judge" })
      );
    }
    for (const evt of validEvents) {
      writes.push(
        db.insert(scoreEvents).values({
          matchId,
          gameNumber: evt.gameNumber as number,
          eventOrder: evt.eventOrder as number,
          scoringSide: evt.scoringSide as "home" | "away",
          homeScore: evt.homeScore as number,
          awayScore: evt.awayScore as number,
          timestamp: typeof evt.timestamp === "string" ? evt.timestamp : nowIso,
        })
      );
    }

    await db.batch(writes as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);

    // Read back inserted games (after the atomic write) for the response.
    const insertedGames = await db
      .select()
      .from(matchGames)
      .where(eq(matchGames.matchId, matchId))
      .all();

    return NextResponse.json({
      match: {
        ...match,
        status: "finished",
        winner: matchWinner,
      },
      games: insertedGames,
    });
  } catch (error) {
    console.error("Score match error:", error);
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}
