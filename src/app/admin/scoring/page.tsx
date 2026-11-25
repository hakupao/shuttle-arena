"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { useTournament } from "@/lib/tournament-context";
import { sanitizeIntegerInput } from "@/lib/utils";
import { useT } from "@/i18n/provider";
import { matchTypeLabel } from "@/i18n/labels";
import {
  PenLine,
  CheckCircle,
  Send,
  ChevronRight,
} from "lucide-react";

interface Tournament {
  id: number;
  name: string;
  status: string;
  scoringMode: string;
}

interface GroupInfo {
  id: number;
  icon: string;
  name: string;
}

interface PlayerInfo {
  id: number;
  groupId: number;
  positionNumber: number;
  name: string | null;
}

interface GameScore {
  gameNumber: number;
  homeScore: number;
  awayScore: number;
  winner: string | null;
}

interface ScheduleMatch {
  id: number;
  roundNumber: number;
  courtNumber: number;
  matchType: string;
  status: string;
  winner: string | null;
  homeGroupId: number;
  awayGroupId: number;
  homePlayer1Id: number | null;
  homePlayer2Id: number | null;
  awayPlayer1Id: number | null;
  awayPlayer2Id: number | null;
  games?: GameScore[];
}

interface GameInput {
  homeScore: string;
  awayScore: string;
}

interface ScheduleResponse {
  matches?: ScheduleMatch[];
}

interface TournamentResponse {
  groups?: GroupInfo[];
  players?: PlayerInfo[];
  tournament?: Tournament | null;
}

export default function AdminScoringPage() {
  const t = useT();
  const { currentId, loading: tournamentLoading } = useTournament();
  const tournamentId = currentId ? String(currentId) : "";
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedTournamentId, setLoadedTournamentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "finished">("pending");

  // Scoring modal state
  const [scoringMatch, setScoringMatch] = useState<ScheduleMatch | null>(null);
  const [games, setGames] = useState<GameInput[]>([{ homeScore: "", awayScore: "" }]);
  const [refereeId, setRefereeId] = useState<string>("");
  const [lineJudgeId, setLineJudgeId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [batchScores, setBatchScores] = useState<Record<number, { homeScore: string; awayScore: string }>>({});
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const fetchData = useCallback(() => {
    if (!tournamentId) {
      setLoadedTournamentId(null);
      setLoading(false);
      return;
    }
    const selectedTournamentId = currentId;
    setLoading(true);
    Promise.all([
      fetch(`/api/tournaments/${tournamentId}/schedule`).then((r) => r.json() as Promise<ScheduleResponse>),
      fetch(`/api/tournaments/${tournamentId}`).then((r) => r.json() as Promise<TournamentResponse>),
    ]).then(([scheduleData, tournamentData]) => {
      setMatches(scheduleData.matches || []);
      setGroups(tournamentData.groups || []);
      setPlayers(tournamentData.players || []);
      setTournament(tournamentData.tournament || null);
      setLoading(false);
      if (selectedTournamentId !== undefined) {
        setLoadedTournamentId(selectedTournamentId ?? null);
      }
    }).catch(() => {
      setLoading(false);
      if (selectedTournamentId !== undefined) {
        setLoadedTournamentId(selectedTournamentId ?? null);
      }
    });
  }, [currentId, tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const formatPlayer = (pid: number | null) => {
    if (!pid) return "?";
    const p = playerMap.get(pid);
    if (!p) return "?";
    const g = groupMap.get(p.groupId);
    return p.name || `${g?.icon || ""}${p.positionNumber}${t("common.position.suffix")}`;
  };

  const formatPlayerById = (idStr: string) => {
    if (!idStr || idStr === "none") return null;
    const p = playerMap.get(Number(idStr));
    if (!p) return null;
    const g = groupMap.get(p.groupId);
    return `${g?.icon || ""} ${p.name || `${p.positionNumber}${t("common.position.suffix")}`}`;
  };

  const filteredMatches = matches.filter((m) => {
    if (statusFilter === "all") return true;
    return m.status === statusFilter;
  });

  const maxRound = matches.length > 0 ? Math.max(...matches.map((m) => m.roundNumber)) : 0;

  const openScoring = (match: ScheduleMatch) => {
    setScoringMatch(match);
    const mode = tournament?.scoringMode || "single_21";
    const numGames = mode.startsWith("best_of_3") ? 3 : 1;

    if (match.status === "finished" && match.games && match.games.length > 0) {
      const prefilled = Array.from({ length: numGames }, (_, i) => {
        const existing = match.games?.find((g) => g.gameNumber === i + 1);
        return existing
          ? { homeScore: String(existing.homeScore), awayScore: String(existing.awayScore) }
          : { homeScore: "", awayScore: "" };
      });
      setGames(prefilled);
    } else {
      setGames(
        Array.from({ length: numGames }, () => ({ homeScore: "", awayScore: "" }))
      );
    }
    setRefereeId("");
    setLineJudgeId("");
  };

  const closeScoring = () => {
    setScoringMatch(null);
  };

  const updateGame = (index: number, field: "homeScore" | "awayScore", value: string) => {
    setGames((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const submitScore = async () => {
    if (!scoringMatch) return;

    const validGames = games.filter(
      (g) => g.homeScore !== "" && g.awayScore !== ""
    );

    if (validGames.length === 0) {
      toast.error(t("adminScoring.needOneGame"));
      return;
    }

    for (const g of validGames) {
      const h = parseInt(g.homeScore, 10);
      const a = parseInt(g.awayScore, 10);
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
        toast.error(t("adminScoring.nonNegativeInt"));
        return;
      }
      if (h === a) {
        toast.error(t("adminScoring.scoresEqualDecide"));
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${scoringMatch.id}/score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            games: validGames.map((g) => ({
              homeScore: parseInt(g.homeScore, 10),
              awayScore: parseInt(g.awayScore, 10),
            })),
            refereePlayerId: refereeId ? Number(refereeId) : undefined,
            lineJudgePlayerId: lineJudgeId ? Number(lineJudgeId) : undefined,
          }),
        }
      );

      if (res.ok) {
        toast.success(t("adminScoring.scoreSaved"));
        closeScoring();
        fetchData();
      } else {
        const err = await res.json() as { error?: string };
        toast.error(err.error || t("adminScoring.entryFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateBatchScore = (matchId: number, field: "homeScore" | "awayScore", value: string) => {
    setBatchScores((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || { homeScore: "", awayScore: "" }), [field]: value },
    }));
  };

  const submitBatch = async () => {
    const entries = Object.entries(batchScores).filter(
      ([, s]) => s.homeScore !== "" && s.awayScore !== ""
    );

    if (entries.length === 0) {
      toast.error(t("adminScoring.needOneMatch"));
      return;
    }

    for (const [, s] of entries) {
      const h = parseInt(s.homeScore, 10);
      const a = parseInt(s.awayScore, 10);
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
        toast.error(t("adminScoring.nonNegativeInt"));
        return;
      }
      if (h === a) {
        toast.error(t("adminScoring.scoresEqual"));
        return;
      }
    }

    setBatchSubmitting(true);
    let successCount = 0;
    for (const [matchIdStr, scores] of entries) {
      try {
        const res = await fetch(
          `/api/tournaments/${tournamentId}/matches/${matchIdStr}/score`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              games: [{
                homeScore: parseInt(scores.homeScore, 10),
                awayScore: parseInt(scores.awayScore, 10),
              }],
            }),
          }
        );
        if (res.ok) successCount++;
      } catch { /* skip */ }
    }

    toast.success(t("adminScoring.batchDone", { success: successCount, total: entries.length }));
    setBatchScores({});
    setBatchSubmitting(false);
    fetchData();
  };

  if (tournamentLoading || (currentId !== null && loadedTournamentId !== currentId) || loading) {
    return <div className="text-center py-12 text-muted-foreground">{t("adminScoring.loading")}</div>;
  }

  if (!currentId) {
    return (
      <div className="admin-page-medium">
        <AdminPageHeader
          title={t("adminScoring.title")}
          icon={PenLine}
          iconClassName="w-4.5 h-4.5 text-rose-500"
        />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            {t("adminScoring.selectTournamentFirst")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page-medium">
      <AdminPageHeader
        title={t("adminScoring.title")}
        icon={PenLine}
        iconClassName="w-4.5 h-4.5 text-rose-500"
        actions={(
          <div className="flex gap-1.5 flex-wrap">
            {([["pending", t("adminScoring.filterPending")], ["finished", t("adminScoring.filterFinished")], ["all", t("adminScoring.filterAll")]] as const).map(([val, label]) => (
              <Button
                key={val}
                variant={statusFilter === val ? "default" : "outline"}
                size="sm"
                className={statusFilter === val ? "bg-rose-600 hover:bg-rose-700 text-white" : "text-gray-500"}
                onClick={() => setStatusFilter(val)}
              >
                {label}
              </Button>
            ))}
            <Button
              variant={batchMode ? "default" : "outline"}
              size="sm"
              className={batchMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-amber-600 border-amber-200"}
              onClick={() => { setBatchMode(!batchMode); setBatchScores({}); }}
            >
              {batchMode ? t("adminScoring.exitBatch") : t("adminScoring.batchEntry")}
            </Button>
          </div>
        )}
      />

      {/* Match List */}
      {matches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <PenLine className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("adminScoring.noMatches")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("adminScoring.publishScheduleFirst")}</p>
          </CardContent>
        </Card>
      ) : filteredMatches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-muted-foreground">
              {statusFilter === "pending" ? t("adminScoring.allEntered") : t("adminScoring.noneMatching")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: maxRound }, (_, roundIdx) => {
            const roundNum = roundIdx + 1;
            const roundMatches = filteredMatches.filter((m) => m.roundNumber === roundNum);
            if (roundMatches.length === 0) return null;

            return (
              <div key={roundNum}>
                <h3 className="text-sm font-semibold text-rose-600 mb-2">{t("adminScoring.roundN", { n: roundNum })}</h3>
                <div className="space-y-2">
                  {roundMatches.map((match) => {
                    const homeGroup = groupMap.get(match.homeGroupId);
                    const awayGroup = groupMap.get(match.awayGroupId);
                    const isFinished = match.status === "finished";

                    return (
                      <Card
                        key={match.id}
                        className={`border-gray-100 transition-all ${batchMode ? "" : "hover:border-rose-300 hover:shadow-md cursor-pointer"}`}
                        onClick={() => !batchMode && openScoring(match)}
                      >
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {t("adminScoring.matchCourt", { type: matchTypeLabel(t, match.matchType), court: match.courtNumber })}
                                </Badge>
                                {isFinished ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    <CheckCircle className="w-3 h-3 mr-0.5" /> {t("adminScoring.recorded")}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                                    {t("adminScoring.pending")}
                                  </Badge>
                                )}
                              </div>
                              <div className="font-medium truncate">
                                {homeGroup?.icon} {homeGroup?.name}
                                <span className="text-gray-400 mx-2">vs</span>
                                {awayGroup?.icon} {awayGroup?.name}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                                {formatPlayer(match.homePlayer1Id)} + {formatPlayer(match.homePlayer2Id)}
                                <span className="mx-2">|</span>
                                {formatPlayer(match.awayPlayer1Id)} + {formatPlayer(match.awayPlayer2Id)}
                              </div>
                            </div>
                            {batchMode && !isFinished ? (
                              <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder={t("adminScoring.homePlaceholder")}
                                  value={batchScores[match.id]?.homeScore || ""}
                                  onChange={(e) => updateBatchScore(match.id, "homeScore", sanitizeIntegerInput(e.target.value))}
                                  className="w-14 h-8 text-center text-sm font-bold"
                                />
                                <span className="text-gray-400 font-bold">:</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder={t("adminScoring.awayPlaceholder")}
                                  value={batchScores[match.id]?.awayScore || ""}
                                  onChange={(e) => updateBatchScore(match.id, "awayScore", sanitizeIntegerInput(e.target.value))}
                                  className="w-14 h-8 text-center text-sm font-bold"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {isFinished && match.winner && (
                                  <Badge className="bg-amber-100 text-amber-700 text-xs hidden sm:inline-flex">
                                    {t("adminScoring.winnerBadge", { name: (match.winner === "home" ? homeGroup?.name : awayGroup?.name) ?? "" })}
                                  </Badge>
                                )}
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Batch Submit Bar */}
      {batchMode && Object.keys(batchScores).length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <Card className="border-amber-200 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardContent className="py-3 px-6 flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {t("adminScoring.pendingSubmit", { n: Object.values(batchScores).filter((s) => s.homeScore && s.awayScore).length })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchScores({})}
              >
                {t("adminScoring.clear")}
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
                onClick={submitBatch}
                disabled={batchSubmitting}
              >
                <Send className="w-3.5 h-3.5" />
                {batchSubmitting ? t("adminScoring.submitting") : t("adminScoring.batchSubmit")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scoring Modal */}
      {scoringMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md border-rose-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <CardContent className="pt-6 space-y-5">
              {/* Match Info */}
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  {t("adminScoring.modalHeader", {
                    round: scoringMatch.roundNumber,
                    court: scoringMatch.courtNumber,
                    type: matchTypeLabel(t, scoringMatch.matchType),
                  })}
                </Badge>
                <div className="flex items-center justify-center gap-3 mt-2 text-lg font-semibold">
                  <span>
                    {groupMap.get(scoringMatch.homeGroupId)?.icon}{" "}
                    {groupMap.get(scoringMatch.homeGroupId)?.name}
                  </span>
                  <span className="text-gray-400">vs</span>
                  <span>
                    {groupMap.get(scoringMatch.awayGroupId)?.icon}{" "}
                    {groupMap.get(scoringMatch.awayGroupId)?.name}
                  </span>
                </div>
              </div>

              {/* Score Inputs */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">
                  {scoringMatch.status === "finished" ? t("adminScoring.editScore") : t("adminScoring.enterScore")}
                </div>
                {games.map((game, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {games.length > 1 && (
                      <span className="text-xs text-muted-foreground w-12">{t("adminScoring.gameN", { n: i + 1 })}</span>
                    )}
                    <div className="flex-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={t("adminScoring.homeTeam")}
                        value={game.homeScore}
                        onChange={(e) => updateGame(i, "homeScore", sanitizeIntegerInput(e.target.value))}
                        className="text-center font-bold text-lg"
                      />
                    </div>
                    <span className="text-gray-400 font-bold">:</span>
                    <div className="flex-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={t("adminScoring.awayTeam")}
                        value={game.awayScore}
                        onChange={(e) => updateGame(i, "awayScore", sanitizeIntegerInput(e.target.value))}
                        className="text-center font-bold text-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Referee */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">{t("adminScoring.refereeAndLine")}</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="text-xs text-muted-foreground">{t("adminScoring.referee")}</label>
                    <Select value={refereeId} onValueChange={(v: string | null) => setRefereeId(v || "")}>
                      <SelectTrigger className="mt-1">
                        <span className="flex flex-1 text-left truncate">
                          {formatPlayerById(refereeId) || t("adminScoring.select")}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("adminScoring.none")}</SelectItem>
                        {players.map((p) => {
                          const g = groupMap.get(p.groupId);
                          return (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {g?.icon || ""} {p.name || `${p.positionNumber}${t("common.position.suffix")}`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-muted-foreground">{t("adminScoring.lineJudge")}</label>
                    <Select value={lineJudgeId} onValueChange={(v: string | null) => setLineJudgeId(v || "")}>
                      <SelectTrigger className="mt-1">
                        <span className="flex flex-1 text-left truncate">
                          {formatPlayerById(lineJudgeId) || t("adminScoring.select")}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("adminScoring.none")}</SelectItem>
                        {players.map((p) => {
                          const g = groupMap.get(p.groupId);
                          return (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {g?.icon || ""} {p.name || `${p.positionNumber}${t("common.position.suffix")}`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={closeScoring}>
                  {t("adminScoring.cancel")}
                </Button>
                <Button
                  className="flex-1 bg-rose-600 hover:bg-rose-700 gap-1"
                  onClick={submitScore}
                  disabled={submitting}
                >
                  <Send className="w-4 h-4" />
                  {submitting ? t("adminScoring.submitting") : t("adminScoring.submitScore")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
