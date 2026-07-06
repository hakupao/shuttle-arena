// Pure group-standings computation, extracted from the stats route so the
// encounter/points logic can be unit-tested directly (see standings.test.ts).
//
// Encounter model: two groups play a best-of-N "对阵" (encounter) whose matches
// get consecutive round numbers. The group winning more matches takes the
// encounter and 3 points (1 each on a tie). Encounters are grouped from ALL
// matches of a pair (not just finished ones) so an unfinished match in the
// middle can't split one encounter into two and double-award points; encounter
// points are only awarded once every match in the encounter is finished.

export interface GroupStanding {
  groupId: number;
  groupName: string;
  groupIcon: string;
  wins: number;
  draws: number;
  losses: number;
  points: number; // win=3, draw=1, loss=0
  matchesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  netGames: number;
  pointsFor: number;
  pointsAgainst: number;
  netPoints: number;
}

export interface StandingGroup {
  id: number;
  name: string;
  icon: string;
}

export interface StandingMatch {
  id: number;
  roundNumber: number;
  homeGroupId: number;
  awayGroupId: number;
  status: string;
  winner: "home" | "away" | null;
}

export interface StandingGame {
  homeScore: number;
  awayScore: number;
}

export function computeGroupStandings(
  groups: StandingGroup[],
  allMatches: StandingMatch[],
  gamesByMatch: Map<number, StandingGame[]>
): GroupStanding[] {
  const groupStandings: GroupStanding[] = groups.map((g) => ({
    groupId: g.id,
    groupName: g.name,
    groupIcon: g.icon,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    matchesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    netGames: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    netPoints: 0,
  }));

  const standingMap = new Map(groupStandings.map((s) => [s.groupId, s]));

  // Group all of a pair's matches together (finished or not).
  const pairMatchesMap = new Map<string, StandingMatch[]>();
  for (const m of allMatches) {
    const [minId, maxId] = m.homeGroupId < m.awayGroupId
      ? [m.homeGroupId, m.awayGroupId]
      : [m.awayGroupId, m.homeGroupId];
    const key = `${minId}-${maxId}`;
    let arr = pairMatchesMap.get(key);
    if (!arr) {
      arr = [];
      pairMatchesMap.set(key, arr);
    }
    arr.push(m);
  }

  // Split each pair's matches into encounters by detecting round gaps.
  const allEncounters: StandingMatch[][] = [];
  for (const pairMatches of pairMatchesMap.values()) {
    pairMatches.sort((a, b) => a.roundNumber - b.roundNumber);
    let encounter = [pairMatches[0]];
    for (let i = 1; i < pairMatches.length; i++) {
      if (pairMatches[i].roundNumber - pairMatches[i - 1].roundNumber <= 1) {
        encounter.push(pairMatches[i]);
      } else {
        allEncounters.push(encounter);
        encounter = [pairMatches[i]];
      }
    }
    allEncounters.push(encounter);
  }

  for (const encounterMatches of allEncounters) {
    const matchWins = new Map<number, number>();
    const groupIds = new Set<number>();
    const encounterComplete = encounterMatches.every((m) => m.status === "finished");

    for (const m of encounterMatches) {
      groupIds.add(m.homeGroupId);
      groupIds.add(m.awayGroupId);

      // Per-match stats only count finished matches.
      if (m.status !== "finished") continue;

      const homeStanding = standingMap.get(m.homeGroupId);
      const awayStanding = standingMap.get(m.awayGroupId);
      if (!homeStanding || !awayStanding) continue;

      homeStanding.matchesPlayed++;
      awayStanding.matchesPlayed++;

      const matchGamesList = gamesByMatch.get(m.id) || [];
      for (const g of matchGamesList) {
        homeStanding.pointsFor += g.homeScore;
        homeStanding.pointsAgainst += g.awayScore;
        awayStanding.pointsFor += g.awayScore;
        awayStanding.pointsAgainst += g.homeScore;
      }

      if (m.winner === "home") {
        homeStanding.wins++;
        awayStanding.losses++;
        matchWins.set(m.homeGroupId, (matchWins.get(m.homeGroupId) || 0) + 1);
      } else if (m.winner === "away") {
        awayStanding.wins++;
        homeStanding.losses++;
        matchWins.set(m.awayGroupId, (matchWins.get(m.awayGroupId) || 0) + 1);
      } else {
        homeStanding.draws++;
        awayStanding.draws++;
      }
    }

    const [groupAId, groupBId] = [...groupIds];
    const standingA = standingMap.get(groupAId);
    const standingB = standingMap.get(groupBId);
    if (!standingA || !standingB) continue;

    const aMatchWins = matchWins.get(groupAId) || 0;
    const bMatchWins = matchWins.get(groupBId) || 0;

    standingA.gamesWon += aMatchWins;
    standingA.gamesLost += bMatchWins;
    standingB.gamesWon += bMatchWins;
    standingB.gamesLost += aMatchWins;

    // Encounter points only once the whole encounter is decided.
    if (!encounterComplete) continue;
    if (aMatchWins > bMatchWins) {
      standingA.points += 3;
    } else if (bMatchWins > aMatchWins) {
      standingB.points += 3;
    } else {
      standingA.points += 1;
      standingB.points += 1;
    }
  }

  for (const s of groupStandings) {
    s.netGames = s.gamesWon - s.gamesLost;
    s.netPoints = s.pointsFor - s.pointsAgainst;
  }

  groupStandings.sort((a, b) =>
    b.points - a.points || b.netGames - a.netGames || b.netPoints - a.netPoints
  );

  return groupStandings;
}
