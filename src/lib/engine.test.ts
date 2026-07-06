import { describe, it, expect } from "vitest";
import { generateMatches, scheduleMatches, generateTimeSlots, type SimulationParams } from "./engine";
import { buildDefaultTemplate } from "./constants";

function build(groupCount: number, males = 2, females = 2, courts = 3) {
  const template = buildDefaultTemplate(males, females);
  const params: SimulationParams = {
    groupCount,
    malesPerGroup: males,
    femalesPerGroup: females,
    courtsCount: courts,
    roundDurationMinutes: 20,
    startTime: "09:00",
    endTime: "19:00",
    templateMatches: template.matches,
  };
  const generated = generateMatches(params);
  const scheduled = scheduleMatches(generated, courts, groupCount);
  return { templateCount: template.matches.length, generated, scheduled };
}

describe("generateMatches", () => {
  it("produces exactly C(groups,2) * templateCount matches", () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8]) {
      const { templateCount, generated } = build(n);
      expect(generated.length).toBe((n * (n - 1)) / 2 * templateCount);
    }
  });

  it("plays every unordered group pair", () => {
    const { generated } = build(5);
    const pairs = new Set(generated.map((m) => {
      const [a, b] = m.homeGroupIndex < m.awayGroupIndex
        ? [m.homeGroupIndex, m.awayGroupIndex]
        : [m.awayGroupIndex, m.homeGroupIndex];
      return `${a}-${b}`;
    }));
    expect(pairs.size).toBe((5 * 4) / 2);
  });
});

describe("scheduleMatches — invariants", () => {
  it("schedules every generated match exactly once (terminates for 2..8 groups)", () => {
    // key each match by its identity so a drop+duplicate (equal count) is caught.
    const key = (m: { homeGroupIndex: number; awayGroupIndex: number; templateIndex: number }) =>
      `${m.homeGroupIndex}-${m.awayGroupIndex}-${m.templateIndex}`;
    for (const n of [2, 3, 4, 5, 6, 7, 8]) {
      const { generated, scheduled } = build(n);
      expect(scheduled.length).toBe(generated.length);
      const genCounts = new Map<string, number>();
      for (const m of generated) genCounts.set(key(m), (genCounts.get(key(m)) || 0) + 1);
      const schedCounts = new Map<string, number>();
      for (const m of scheduled) schedCounts.set(key(m), (schedCounts.get(key(m)) || 0) + 1);
      expect(schedCounts).toEqual(genCounts); // same multiset of matches, each exactly once
    }
  });

  it("never double-books a player within a round and never reuses a court in a round", () => {
    for (const n of [3, 4, 5, 6, 7, 8]) {
      const courts = 3;
      const { scheduled } = build(n, 2, 2, courts);
      const rounds = new Map<number, { players: Set<string>; courts: Set<number> }>();
      for (const m of scheduled) {
        if (!rounds.has(m.roundNumber)) rounds.set(m.roundNumber, { players: new Set(), courts: new Set() });
        const r = rounds.get(m.roundNumber)!;

        const slots = [
          `${m.homeGroupIndex}:${m.homePos1}`,
          `${m.homeGroupIndex}:${m.homePos2}`,
          `${m.awayGroupIndex}:${m.awayPos1}`,
          `${m.awayGroupIndex}:${m.awayPos2}`,
        ];
        for (const s of slots) {
          expect(r.players.has(s), `player ${s} double-booked in round ${m.roundNumber} (groups=${n})`).toBe(false);
          r.players.add(s);
        }

        expect(r.courts.has(m.courtNumber), `court ${m.courtNumber} reused in round ${m.roundNumber} (groups=${n})`).toBe(false);
        r.courts.add(m.courtNumber);

        expect(m.courtNumber).toBeGreaterThanOrEqual(1);
        expect(m.courtNumber).toBeLessThanOrEqual(courts);
      }
    }
  });
});

describe("generateTimeSlots", () => {
  it("returns one slot per round", () => {
    expect(generateTimeSlots(5, "09:00", 20)).toHaveLength(5);
    expect(generateTimeSlots(0, "09:00", 20)).toHaveLength(0);
  });

  it("advances by the round duration", () => {
    const slots = generateTimeSlots(3, "09:00", 30);
    expect(slots[0]).toBe("09:00");
    expect(slots[1]).toBe("09:30");
    expect(slots[2]).toBe("10:00");
  });
});
