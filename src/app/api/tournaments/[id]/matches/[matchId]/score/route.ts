import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { matches, matchGames, refereeRecords, scoreEvents, tournaments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { SCORING_MODES, type ScoringMode } from "@/lib/constants";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

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

interface ValidatedScoreGame {
  homeScore: number;
  awayScore: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "请先登录后再记分" },
        { status: 401 }
      );
    }
    const db = getDb();
    const { id, matchId: matchIdStr } = await params;
    const tournamentId = parseInt(id, 10);
    const matchId = parseInt(matchIdStr, 10);

    if (isNaN(tournamentId) || isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .get();

    if (!match || match.tournamentId !== tournamentId) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Block all scoring for archived tournaments
    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get();
    if (tournament?.status === "archived") {
      return NextResponse.json({ error: "赛事已归档，数据已冻结，不能修改" }, { status: 403 });
    }

    const isAdmin = user.role === "admin";

    // Authorization: only admins or bound players (participants / referees /
    // line judges are all bound players in this tournament) may submit scores.
    // Logged-in spectator accounts with no player binding cannot.
    if (!isAdmin && user.playerId == null) {
      return NextResponse.json(
        { error: "只有管理员或参赛选手可以记分" },
        { status: 403 }
      );
    }

    if (match.status === "finished" && !isAdmin) {
      return NextResponse.json(
        { error: "比分已提交，如需修改请联系管理员" },
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

    if (!Array.isArray(games) || games.length === 0) {
      return NextResponse.json(
        { error: "games must be a non-empty array of {homeScore, awayScore}" },
        { status: 400 }
      );
    }

    // Server-side score sanity limits (client is not trusted): bound the number
    // of games to the tournament's scoring mode, cap per-game scores to block
    // absurd/Infinity values from poisoning standings, and cap the timeline.
    const scoringMode = (tournament?.scoringMode || "single_21") as ScoringMode;
    const scoringInfo = SCORING_MODES[scoringMode] ?? SCORING_MODES.single_21;
    const MAX_GAME_SCORE = 60; // real badminton tops out ~30; 60 is a safe ceiling
    const MAX_SCORE_EVENTS = 2000;

    if (games.length > scoringInfo.games) {
      return NextResponse.json(
        { error: `本赛制最多 ${scoringInfo.games} 局，收到 ${games.length} 局` },
        { status: 400 }
      );
    }

    if (scoreEventLog.length > MAX_SCORE_EVENTS) {
      return NextResponse.json(
        { error: "计分明细条目过多" },
        { status: 400 }
      );
    }

    if (!isAdmin) {
      const claimedIds = [refereePlayerId, lineJudgePlayerId].filter(
        (playerId): playerId is number => typeof playerId === "number"
      );

      if (claimedIds.length > 0 && !user) {
        return NextResponse.json(
          { error: "匿名记分不能登记裁判身份，请先登录并绑定选手" },
          { status: 401 }
        );
      }

      if (claimedIds.length > 0 && !user?.playerId) {
        return NextResponse.json(
          { error: "你的账号未绑定选手，不能登记裁判身份" },
          { status: 400 }
        );
      }

      if (claimedIds.some((playerId) => playerId !== user?.playerId)) {
        return NextResponse.json(
          { error: "普通用户只能登记自己的裁判身份" },
          { status: 403 }
        );
      }
    }

    const validatedGames: ValidatedScoreGame[] = [];

    // Validate each game
    for (const game of games) {
      if (
        typeof game.homeScore !== "number" ||
        typeof game.awayScore !== "number" ||
        !Number.isInteger(game.homeScore) ||
        !Number.isInteger(game.awayScore) ||
        game.homeScore < 0 ||
        game.awayScore < 0 ||
        game.homeScore > MAX_GAME_SCORE ||
        game.awayScore > MAX_GAME_SCORE
      ) {
        return NextResponse.json(
          { error: `每局比分必须是 0 到 ${MAX_GAME_SCORE} 之间的整数` },
          { status: 400 }
        );
      }

      validatedGames.push({
        homeScore: game.homeScore,
        awayScore: game.awayScore,
      });
    }

    // Compute game winners in memory, then apply every write as ONE atomic D1
    // batch. Previously this was a sequence of independent statements, so a
    // mid-sequence failure could leave the match 'finished' with missing or
    // partial games; D1 batches are transactional (all-or-nothing).
    let homeWins = 0;
    let awayWins = 0;
    const gameRows = validatedGames.map((g, i) => {
      let gameWinner: "home" | "away" | null = null;
      if (g.homeScore > g.awayScore) {
        gameWinner = "home";
        homeWins++;
      } else if (g.awayScore > g.homeScore) {
        gameWinner = "away";
        awayWins++;
      }
      return {
        matchId,
        gameNumber: i + 1,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        winner: gameWinner,
      };
    });

    // Overall match winner (majority of games; tie stays null / draw)
    let matchWinner: "home" | "away" | null = null;
    if (homeWins > awayWins) {
      matchWinner = "home";
    } else if (awayWins > homeWins) {
      matchWinner = "away";
    }

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
      ...gameRows.map((row) => db.insert(matchGames).values(row)),
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
