"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ArrowLeftRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { useTournament } from "@/lib/tournament-context";
import { useT } from "@/i18n/provider";
import { matchTypeLabel } from "@/i18n/labels";

interface PlayerInfo {
  id: number;
  name: string | null;
  positionNumber: number;
  slotIndex: number;
  groupId: number;
  gender: "M" | "F";
}

interface GroupInfo {
  id: number;
  name: string;
  icon: string;
}

interface MatchInfo {
  id: number;
  roundNumber: number;
  courtNumber: number;
  matchType: string;
  status: string;
  homeGroupId: number;
  awayGroupId: number;
  homePlayer1Id: number | null;
  homePlayer2Id: number | null;
  awayPlayer1Id: number | null;
  awayPlayer2Id: number | null;
}

type PlayerSlot = "homePlayer1" | "homePlayer2" | "awayPlayer1" | "awayPlayer2";

const PLAYER_SLOTS: { key: PlayerSlot; idKey: keyof MatchInfo; side: "home" | "away" }[] = [
  { key: "homePlayer1", idKey: "homePlayer1Id", side: "home" },
  { key: "homePlayer2", idKey: "homePlayer2Id", side: "home" },
  { key: "awayPlayer1", idKey: "awayPlayer1Id", side: "away" },
  { key: "awayPlayer2", idKey: "awayPlayer2Id", side: "away" },
];

export default function AdminSwapPage() {
  const t = useT();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const { currentId, loading: tournamentLoading } = useTournament();
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState<number | null>(null); // matchId being swapped

  const fetchData = useCallback(async () => {
    if (!currentId) {
      setMatches([]);
      setPlayers([]);
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [scheduleRes, groupsRes] = await Promise.all([
        fetch(`/api/tournaments/${currentId}/schedule`),
        fetch(`/api/tournaments/${currentId}/groups`),
      ]);

      const scheduleData = await scheduleRes.json() as { matches?: MatchInfo[] };
      const groupsData = await groupsRes.json() as { groups?: Array<GroupInfo & { players: PlayerInfo[] }> };

      setMatches((scheduleData.matches || []).sort((a, b) =>
        a.roundNumber - b.roundNumber || a.courtNumber - b.courtNumber
      ));

      const allGroups = groupsData.groups || [];
      setGroups(allGroups.map(g => ({ id: g.id, name: g.name, icon: g.icon })));
      setPlayers(allGroups.flatMap(g => g.players));
    } catch {
      toast.error(tRef.current("adminSwap.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [currentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPlayer = (id: number | null) => {
    if (!id) return null;
    return players.find(p => p.id === id) || null;
  };

  const getGroup = (id: number) => groups.find(g => g.id === id);

  // Find the alternate player for a given player (same group, same position, different slot)
  const getAlternate = (player: PlayerInfo): PlayerInfo | null => {
    return players.find(p =>
      p.groupId === player.groupId &&
      p.positionNumber === player.positionNumber &&
      p.id !== player.id
    ) || null;
  };

  const handleSwap = async (matchId: number, slot: PlayerSlot, newPlayerId: number) => {
    setSwapping(matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}/swap-player`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, newPlayerId }),
      });

      if (res.ok) {
        const data = await res.json() as { match: MatchInfo };
        setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...data.match } : m));
        toast.success(t("adminSwap.swapSuccess"));
      } else {
        const data = await res.json() as { error?: string };
        toast.error(data.error || t("adminSwap.swapFailed"));
      }
    } catch {
      toast.error(t("adminSwap.networkError"));
    } finally {
      setSwapping(null);
    }
  };

  // Compute per-player appearance counts
  const playerAppearances = new Map<number, number>();
  for (const m of matches) {
    if (m.status !== "pending") continue; // only count pending matches for planning
    for (const { idKey } of PLAYER_SLOTS) {
      const pid = m[idKey] as number | null;
      if (pid) playerAppearances.set(pid, (playerAppearances.get(pid) || 0) + 1);
    }
  }

  // Check which positions have alternates
  const positionsWithAlternates = new Set<string>();
  for (const p of players) {
    if ((p.slotIndex || 1) === 2) {
      positionsWithAlternates.add(`${p.groupId}-${p.positionNumber}`);
    }
  }

  // Helper: does this match involve any position with alternates?
  const matchHasAlternate = (m: MatchInfo) => {
    return PLAYER_SLOTS.some(({ idKey }) => {
      const pid = m[idKey] as number | null;
      if (!pid) return false;
      const player = getPlayer(pid);
      if (!player) return false;
      return positionsWithAlternates.has(`${player.groupId}-${player.positionNumber}`);
    });
  };

  // Only show matches that involve dual-player positions
  const relevantMatches = matches.filter(matchHasAlternate);

  // Group matches by round
  const matchesByRound = new Map<number, MatchInfo[]>();
  for (const m of relevantMatches) {
    const list = matchesByRound.get(m.roundNumber) || [];
    list.push(m);
    matchesByRound.set(m.roundNumber, list);
  }
  const rounds = Array.from(matchesByRound.entries()).sort(([a], [b]) => a - b);

  // Count how many swappable positions exist
  const swappableCount = matches.reduce((acc, m) => {
    if (m.status !== "pending") return acc;
    return acc + PLAYER_SLOTS.filter(({ idKey }) => {
      const pid = m[idKey] as number | null;
      if (!pid) return false;
      const player = getPlayer(pid);
      if (!player) return false;
      return positionsWithAlternates.has(`${player.groupId}-${player.positionNumber}`);
    }).length;
  }, 0);

  if (tournamentLoading || loading) {
    return <div className="text-center py-12 text-gray-400">{t("adminSwap.loading")}</div>;
  }

  if (!currentId || matches.length === 0) {
    return (
      <div className="admin-page-narrow">
        <AdminPageHeader title={t("adminSwap.title")} icon={ArrowLeftRight} iconClassName="w-4.5 h-4.5 text-orange-600" />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            {currentId ? t("adminSwap.noSchedule") : t("adminSwap.selectTournament")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (positionsWithAlternates.size === 0) {
    return (
      <div className="admin-page-narrow">
        <AdminPageHeader title={t("adminSwap.title")} icon={ArrowLeftRight} iconClassName="w-4.5 h-4.5 text-orange-600" />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            {t("adminSwap.noDualPositions")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderPlayerCell = (match: MatchInfo, slot: { key: PlayerSlot; idKey: keyof MatchInfo; side: "home" | "away" }) => {
    const playerId = match[slot.idKey] as number | null;
    const player = getPlayer(playerId);
    if (!player) return <span className="text-gray-300 text-xs">-</span>;

    const alternate = getAlternate(player);
    const hasAlternate = !!alternate;
    const isAlternateSlot = (player.slotIndex || 1) === 2;
    const appearances = playerAppearances.get(player.id) || 0;
    const altAppearances = alternate ? (playerAppearances.get(alternate.id) || 0) : 0;
    const group = getGroup(player.groupId);
    const isPending = match.status === "pending";

    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 shrink-0">{group?.icon}</span>
        <span className={`text-xs font-medium truncate ${isAlternateSlot ? "text-amber-700" : "text-gray-800"}`}>
          {player.name || t("adminSwap.positionFallback", { n: player.positionNumber })}
        </span>
        <span className="text-[10px] text-gray-400 tabular-nums shrink-0">{t("adminSwap.appearances", { n: appearances })}</span>
        {hasAlternate && isPending && (
          <button
            title={t("adminSwap.swapTo", { name: alternate!.name || t("adminSwap.alternateFallback"), n: altAppearances })}
            onClick={() => handleSwap(match.id, slot.key, alternate!.id)}
            disabled={swapping === match.id}
            className="ml-auto shrink-0 p-0.5 rounded text-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            <ArrowLeftRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <AdminPageHeader
        title={t("adminSwap.title")}
        icon={ArrowLeftRight}
        iconClassName="w-4.5 h-4.5 text-orange-600"
        extraBadge={
          <span className="text-xs text-gray-400">
            {t("adminSwap.summary", { swappable: swappableCount, matches: relevantMatches.length })}
          </span>
        }
        actions={(
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="border-gray-200 text-gray-500 gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("adminSwap.refresh")}
          </Button>
        )}
      />

      {/* Player appearance summary */}
      <Card className="border-orange-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-orange-800">{t("adminSwap.statsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {Array.from(positionsWithAlternates).map(posKey => {
              const [gid, pn] = posKey.split("-").map(Number);
              const group = getGroup(gid);
              const primary = players.find(p => p.groupId === gid && p.positionNumber === pn && (p.slotIndex || 1) === 1);
              const alt = players.find(p => p.groupId === gid && p.positionNumber === pn && (p.slotIndex || 1) === 2);
              if (!primary || !alt) return null;
              return (
                <div key={posKey} className="text-xs text-gray-600 flex items-center gap-1">
                  <span>{t("adminSwap.positionStat", { icon: group?.icon ?? "", n: pn })}</span>
                  <span className="font-medium">{primary.name || t("adminSwap.primaryFallback")}</span>
                  <span className="text-gray-400">{t("adminSwap.appearances", { n: playerAppearances.get(primary.id) || 0 })}</span>
                  <span className="text-gray-300">/</span>
                  <span className="font-medium text-amber-700">{alt.name || t("adminSwap.alternateFallback")}</span>
                  <span className="text-gray-400">{t("adminSwap.appearances", { n: playerAppearances.get(alt.id) || 0 })}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Matches by round — only those involving dual-player positions */}
      <div className="space-y-3">
        {rounds.map(([roundNum, roundMatches]) => (
          <Card key={roundNum} className="border-gray-200">
            <CardHeader className="py-2 px-4 bg-gray-50/50 border-b border-gray-100">
              <CardTitle className="text-xs text-gray-500">
                {t("adminSwap.round", { n: roundNum })}
                <span className="ml-2 text-gray-400 font-normal">{t("adminSwap.matchCount", { n: roundMatches.length })}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5">
              {roundMatches.sort((a, b) => a.courtNumber - b.courtNumber).map(match => {
                const homeGroup = getGroup(match.homeGroupId);
                const awayGroup = getGroup(match.awayGroupId);
                const isPending = match.status === "pending";
                return (
                  <div
                    key={match.id}
                    className={`rounded-lg border px-3 py-2 space-y-1.5 ${isPending ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-70"}`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Badge variant="outline" className="text-[10px] border-gray-200 px-1.5 py-0">{t("adminSwap.court", { n: match.courtNumber })}</Badge>
                      <Badge variant="outline" className="text-[10px] border-gray-200 px-1.5 py-0">
                        {matchTypeLabel(t, match.matchType)}
                      </Badge>
                      <span className="text-gray-400 truncate">
                        {homeGroup?.icon} {homeGroup?.name} vs {awayGroup?.icon} {awayGroup?.name}
                      </span>
                      {!isPending && (
                        <Badge className="ml-auto text-[10px] bg-gray-100 text-gray-500 border-gray-200 px-1.5 py-0">
                          {match.status === "finished" ? t("adminSwap.finished") : t("adminSwap.inProgress")}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        {PLAYER_SLOTS.filter(s => s.side === "home").map(slot => (
                          <div key={slot.key}>{renderPlayerCell(match, slot)}</div>
                        ))}
                      </div>
                      <div className="space-y-0.5">
                        {PLAYER_SLOTS.filter(s => s.side === "away").map(slot => (
                          <div key={slot.key}>{renderPlayerCell(match, slot)}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
