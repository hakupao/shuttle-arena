import { describe, it, expect } from "vitest";
import { buildScoredGames, MAX_GAME_SCORE } from "./score-validation";

const ok = (r: ReturnType<typeof buildScoredGames>) => {
  if (!r.ok) throw new Error(`expected ok, got error: ${r.error}`);
  return r;
};

describe("buildScoredGames — H-02 score validation", () => {
  it("rejects an empty or non-array games list", () => {
    expect(buildScoredGames([], 3).ok).toBe(false);
    expect(buildScoredGames(undefined, 3).ok).toBe(false);
    expect(buildScoredGames("nope", 3).ok).toBe(false);
  });

  it("rejects more games than the scoring mode allows", () => {
    const three = [{ homeScore: 21, awayScore: 10 }, { homeScore: 21, awayScore: 12 }, { homeScore: 21, awayScore: 9 }];
    expect(buildScoredGames(three, 1).ok).toBe(false); // single-game mode
    expect(buildScoredGames(three, 3).ok).toBe(true); // best-of-3
  });

  it("accepts a score of exactly the cap and rejects one over it", () => {
    expect(buildScoredGames([{ homeScore: MAX_GAME_SCORE, awayScore: 0 }], 1).ok).toBe(true);
    expect(buildScoredGames([{ homeScore: MAX_GAME_SCORE + 1, awayScore: 0 }], 1).ok).toBe(false);
  });

  it("rejects non-integer, negative, NaN and Infinity scores", () => {
    expect(buildScoredGames([{ homeScore: 10.5, awayScore: 0 }], 1).ok).toBe(false);
    expect(buildScoredGames([{ homeScore: -1, awayScore: 0 }], 1).ok).toBe(false);
    expect(buildScoredGames([{ homeScore: Number.NaN, awayScore: 0 }], 1).ok).toBe(false);
    expect(buildScoredGames([{ homeScore: Infinity, awayScore: 0 }], 1).ok).toBe(false); // 1e999 parses to Infinity
    expect(buildScoredGames([{ homeScore: "21", awayScore: 10 }], 1).ok).toBe(false);
  });

  it("derives per-game winners and numbers games from 1", () => {
    const r = ok(buildScoredGames([{ homeScore: 21, awayScore: 10 }, { homeScore: 12, awayScore: 21 }], 3));
    expect(r.gameRows.map((g) => g.gameNumber)).toEqual([1, 2]);
    expect(r.gameRows.map((g) => g.winner)).toEqual(["home", "away"]);
  });

  it("match winner is the majority of games", () => {
    expect(ok(buildScoredGames([{ homeScore: 21, awayScore: 10 }, { homeScore: 21, awayScore: 12 }], 3)).matchWinner).toBe("home");
    expect(ok(buildScoredGames([{ homeScore: 10, awayScore: 21 }, { homeScore: 12, awayScore: 21 }], 3)).matchWinner).toBe("away");
  });

  it("a games tie leaves the match winner null (draw)", () => {
    const r = ok(buildScoredGames([{ homeScore: 21, awayScore: 10 }, { homeScore: 10, awayScore: 21 }], 3));
    expect(r.matchWinner).toBeNull();
  });

  it("a 0-0 game has no winner", () => {
    const r = ok(buildScoredGames([{ homeScore: 0, awayScore: 0 }], 1));
    expect(r.gameRows[0].winner).toBeNull();
    expect(r.matchWinner).toBeNull();
  });
});
