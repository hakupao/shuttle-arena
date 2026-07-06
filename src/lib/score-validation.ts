// Pure server-side score validation + winner derivation, extracted from the
// score route so the H-02 rules can be unit-tested directly. The client is not
// trusted: scores must be integers within a sane bound, the number of games must
// fit the scoring mode, and the match winner is the majority of game wins.

export const MAX_GAME_SCORE = 60; // real badminton tops out ~30; 60 is a safe ceiling
export const MAX_SCORE_EVENTS = 2000;

export interface ScoredGameRow {
  gameNumber: number;
  homeScore: number;
  awayScore: number;
  winner: "home" | "away" | null;
}

export type ScoreValidation =
  | { ok: false; error: string }
  | { ok: true; gameRows: ScoredGameRow[]; matchWinner: "home" | "away" | null };

export function buildScoredGames(games: unknown, maxGames: number): ScoreValidation {
  if (!Array.isArray(games) || games.length === 0) {
    return { ok: false, error: "games must be a non-empty array of {homeScore, awayScore}" };
  }
  if (games.length > maxGames) {
    return { ok: false, error: `本赛制最多 ${maxGames} 局，收到 ${games.length} 局` };
  }

  const gameRows: ScoredGameRow[] = [];
  let homeWins = 0;
  let awayWins = 0;

  for (let i = 0; i < games.length; i++) {
    const g = games[i] as { homeScore?: unknown; awayScore?: unknown };
    const home = g.homeScore;
    const away = g.awayScore;
    if (
      typeof home !== "number" ||
      typeof away !== "number" ||
      !Number.isInteger(home) ||
      !Number.isInteger(away) ||
      home < 0 ||
      away < 0 ||
      home > MAX_GAME_SCORE ||
      away > MAX_GAME_SCORE
    ) {
      return { ok: false, error: `每局比分必须是 0 到 ${MAX_GAME_SCORE} 之间的整数` };
    }

    let winner: "home" | "away" | null = null;
    if (home > away) {
      winner = "home";
      homeWins++;
    } else if (away > home) {
      winner = "away";
      awayWins++;
    }
    gameRows.push({ gameNumber: i + 1, homeScore: home, awayScore: away, winner });
  }

  // Overall match winner: majority of games; a tie stays null (draw).
  const matchWinner: "home" | "away" | null =
    homeWins > awayWins ? "home" : awayWins > homeWins ? "away" : null;

  return { ok: true, gameRows, matchWinner };
}
