import { describe, it, expect } from "vitest";
import { computeGroupStandings, type StandingMatch, type StandingGame } from "./standings";

const groups = [
  { id: 1, name: "A", icon: "🐱" },
  { id: 2, name: "B", icon: "🐶" },
];

// One BO5 encounter (rounds 1..5) between group 1 (home) and group 2 (away).
function bo5(results: (("home" | "away" | null))[]): {
  matches: StandingMatch[];
  games: Map<number, StandingGame[]>;
} {
  const matches: StandingMatch[] = [];
  const games = new Map<number, StandingGame[]>();
  results.forEach((winner, i) => {
    const id = i + 1;
    matches.push({
      id,
      roundNumber: i + 1,
      homeGroupId: 1,
      awayGroupId: 2,
      status: winner === null ? "pending" : "finished",
      winner: winner,
    });
    if (winner !== null) {
      games.set(id, [
        winner === "home" ? { homeScore: 21, awayScore: 15 } : { homeScore: 15, awayScore: 21 },
      ]);
    }
  });
  return { matches, games };
}

describe("computeGroupStandings — H-03 encounter fragmentation", () => {
  it("awards NO encounter points while a mid-encounter match is unfinished (was double-awarded)", () => {
    // rounds 1,2 -> home wins ; round 3 pending ; rounds 4,5 -> away wins
    const { matches, games } = bo5(["home", "home", null, "away", "away"]);
    const s = computeGroupStandings(groups, matches, games);
    const total = s.reduce((sum, g) => sum + g.points, 0);
    expect(total).toBe(0); // the fragmentation bug produced 6 (3 to each side)
  });

  it("awards exactly 3 points to the winner once the whole encounter is finished", () => {
    // home takes it 3-2 (wins rounds 1,2,3 ; away wins 4,5)
    const { matches, games } = bo5(["home", "home", "home", "away", "away"]);
    const s = computeGroupStandings(groups, matches, games);
    const a = s.find((g) => g.groupId === 1)!;
    const b = s.find((g) => g.groupId === 2)!;
    expect(a.points).toBe(3);
    expect(b.points).toBe(0);
    expect(a.gamesWon).toBe(3);
    expect(b.gamesWon).toBe(2);
  });

  it("awards 1 point to each side on a completed tie", () => {
    // even split over 4 finished matches (2-2)
    const { matches, games } = bo5(["home", "home", "away", "away"]);
    const s = computeGroupStandings(groups, matches, games);
    expect(s.find((g) => g.groupId === 1)!.points).toBe(1);
    expect(s.find((g) => g.groupId === 2)!.points).toBe(1);
  });

  it("keeps per-match points (pointsFor) accumulating even before the encounter completes", () => {
    const { matches, games } = bo5(["home", "home", null, "away", "away"]);
    const s = computeGroupStandings(groups, matches, games);
    const a = s.find((g) => g.groupId === 1)!;
    // 4 finished games; home scored 21,21 (its wins) and 15,15 (its losses) = 72
    expect(a.pointsFor).toBe(72);
    expect(a.matchesPlayed).toBe(4);
  });

  it("sorts by points, then net games, then net points", () => {
    const { matches, games } = bo5(["home", "home", "home", "away", "away"]);
    const s = computeGroupStandings(groups, matches, games);
    expect(s[0].groupId).toBe(1); // winner ranked first
  });
});
