"use client";

export const runtime = "edge";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle, RotateCcw, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  normalizeScoreTimelineEvents,
  ScoreTimelineCard,
  type ScoreTimelineEvent,
} from "@/components/match/score-timeline-card";
import { sanitizeIntegerInput } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { matchTypeLabel } from "@/i18n/labels";

interface MatchData {
  id: number;
  tournamentId: number;
  matchType: string;
  roundNumber: number;
  courtNumber: number;
  status: string;
  scoringMode: string;
  targetScore: number;
  bestOf: number;
  deuceEnabled?: boolean;
  homeGroup: { icon: string; name: string };
  awayGroup: { icon: string; name: string };
  homePlayers: Array<{ id: number; name: string | null; position: number; boundUsername?: string | null }>;
  awayPlayers: Array<{ id: number; name: string | null; position: number; boundUsername?: string | null }>;
  allPlayers: Array<{ id: number; name: string | null; groupIcon: string; position: number; boundUsername?: string | null }>;
  games: Array<{ gameNumber: number; homeScore: number; awayScore: number; winner: string | null }>;
  scoreEvents?: ScoreTimelineEvent[];
}

interface GameScore {
  homeScore: number;
  awayScore: number;
  winner: "home" | "away" | null;
}

interface AdminGameInput {
  homeScore: string;
  awayScore: string;
}

interface ScoreApiError {
  error?: string;
}

interface ScoringDraft {
  games: GameScore[];
  scoreEvents: ScoreTimelineEvent[];
  currentGame: number;
  matchFinished: boolean;
  refereeId: string;
  lineJudgeId: string;
  savedAt: string;
}

function getDraftKey(matchId: string) {
  return `scoring-draft-${matchId}`;
}

function saveDraft(matchId: string, draft: ScoringDraft) {
  try {
    localStorage.setItem(getDraftKey(matchId), JSON.stringify(draft));
  } catch { /* quota exceeded or unavailable — silently ignore */ }
}

function loadDraft(matchId: string): ScoringDraft | null {
  try {
    const raw = localStorage.getItem(getDraftKey(matchId));
    if (!raw) return null;
    return JSON.parse(raw) as ScoringDraft;
  } catch {
    return null;
  }
}

function clearDraft(matchId: string) {
  try {
    localStorage.removeItem(getDraftKey(matchId));
  } catch { /* ignore */ }
}

export default function ScoringPage() {
  const { t, intlLocale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const matchId = params.id as string;
  const isAdmin = user?.role === "admin";

  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);

  // Athlete mode state
  const [games, setGames] = useState<GameScore[]>([{ homeScore: 0, awayScore: 0, winner: null }]);
  const [currentGame, setCurrentGame] = useState(0);
  const [matchFinished, setMatchFinished] = useState(false);

  // Admin mode state
  const [adminGames, setAdminGames] = useState<AdminGameInput[]>([{ homeScore: "", awayScore: "" }]);

  const [refereeId, setRefereeId] = useState<string>("");
  const [lineJudgeId, setLineJudgeId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [scoreEvents, setScoreEvents] = useState<ScoreTimelineEvent[]>([]);

  // Draft recovery state
  const [pendingDraft, setPendingDraft] = useState<ScoringDraft | null>(null);
  const draftReady = useRef(false); // gate: don't persist until initial load is done

  // Determine scoring rules
  const targetScore = match?.targetScore || 21;
  const bestOf = match?.bestOf || 1;
  const deuceEnabled = match?.deuceEnabled ?? true;
  const gamesToWin = Math.ceil(bestOf / 2);

  const isGameWon = (homeScore: number, awayScore: number) => {
    if (homeScore < targetScore && awayScore < targetScore) return false;

    const maxScore = Math.max(homeScore, awayScore);

    // 不追分：达到目标分数即胜
    if (!deuceEnabled) {
      return maxScore >= targetScore;
    }

    // 追分：需要领先 2 分，或达到封顶分数
    const lead = Math.abs(homeScore - awayScore);

    if (targetScore === 21) {
      return lead >= 2 || maxScore >= 30;
    }

    if (targetScore === 15) {
      return lead >= 2 || maxScore >= 20;
    }

    return lead >= 2;
  };

  // Restore draft
  const restoreDraft = useCallback((draft: ScoringDraft) => {
    setGames(draft.games);
    setScoreEvents(normalizeScoreTimelineEvents(draft.scoreEvents));
    setCurrentGame(draft.currentGame);
    setMatchFinished(draft.matchFinished);
    setRefereeId(draft.refereeId);
    setLineJudgeId(draft.lineJudgeId);
    setPendingDraft(null);
    draftReady.current = true;
    toast.success(t("scoring.draftRestored"));
  }, [t]);

  const discardDraft = useCallback(() => {
    clearDraft(matchId);
    setPendingDraft(null);
    draftReady.current = true;
  }, [matchId]);

  // Auto-save draft to localStorage (athlete mode only)
  useEffect(() => {
    if (!draftReady.current || isAdmin || !match) return;
    // Don't save drafts for already-finished matches
    if (match.status === "finished") return;
    // Don't save empty state
    if (games.every((g) => g.homeScore === 0 && g.awayScore === 0)) {
      clearDraft(matchId);
      return;
    }
    saveDraft(matchId, {
      games,
      scoreEvents,
      currentGame,
      matchFinished,
      refereeId,
      lineJudgeId,
      savedAt: new Date().toISOString(),
    });
  }, [games, scoreEvents, currentGame, matchFinished, refereeId, lineJudgeId, isAdmin, match, matchId]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/matches/${matchId}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json() as Promise<MatchData>;
      })
      .then((data) => {
        setMatch(data);
        setScoreEvents(normalizeScoreTimelineEvents(data.scoreEvents || []));

        const numGames = data.bestOf > 1 ? data.bestOf : 1;
        const prefilled = Array.from({ length: numGames }, (_, i) => {
          const existing = data.games.find((g) => g.gameNumber === i + 1);
          return existing
            ? { homeScore: String(existing.homeScore), awayScore: String(existing.awayScore) }
            : { homeScore: "", awayScore: "" };
        });
        setAdminGames(prefilled);

        if (data.games && data.games.length > 0) {
          const athleteGames: GameScore[] = data.games.map((g) => ({
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            winner: g.winner as "home" | "away" | null,
          }));
          setGames(athleteGames);
          setMatchFinished(data.status === "finished");
          setCurrentGame(Math.max(data.games.length - 1, 0));
          draftReady.current = true;
        } else {
          // No server data — check for a saved draft
          const draft = loadDraft(matchId);
          if (draft && draft.games.some((g) => g.homeScore > 0 || g.awayScore > 0)) {
            setPendingDraft(draft);
          } else {
            draftReady.current = true;
          }
          setGames([{ homeScore: 0, awayScore: 0, winner: null }]);
          setMatchFinished(false);
          setCurrentGame(0);
        }

        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });
    return () => controller.abort();
  }, [matchId]);

  // === Athlete mode functions ===
  const addPoint = (side: "home" | "away") => {
    if (matchFinished) return;
    const game = games[currentGame];
    if (!game || game.winner) return;

    const nextGame = { ...game };
    if (side === "home") nextGame.homeScore++;
    else nextGame.awayScore++;

    const updatedGames = [...games];
    updatedGames[currentGame] = nextGame;

    const updatedEvents = normalizeScoreTimelineEvents([
      ...scoreEvents,
      {
        gameNumber: currentGame + 1,
        eventOrder: scoreEvents.filter((evt) => evt.gameNumber === currentGame + 1).length + 1,
        scoringSide: side,
        homeScore: nextGame.homeScore,
        awayScore: nextGame.awayScore,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (isGameWon(nextGame.homeScore, nextGame.awayScore)) {
      nextGame.winner = nextGame.homeScore > nextGame.awayScore ? "home" : "away";
      updatedGames[currentGame] = nextGame;

      const homeGamesWon = updatedGames.filter((g) => g.winner === "home").length;
      const awayGamesWon = updatedGames.filter((g) => g.winner === "away").length;

      if (homeGamesWon >= gamesToWin || awayGamesWon >= gamesToWin) {
        setMatchFinished(true);
      } else if (currentGame + 1 < bestOf && updatedGames.length === currentGame + 1) {
        updatedGames.push({ homeScore: 0, awayScore: 0, winner: null });
        setTimeout(() => setCurrentGame(currentGame + 1), 350);
      }
    }

    setGames(updatedGames);
    setScoreEvents(updatedEvents);
  };

  const undoPoint = (side: "home" | "away") => {
    let lastEventIndex = -1;
    for (let i = scoreEvents.length - 1; i >= 0; i--) {
      if (scoreEvents[i].gameNumber === currentGame + 1) {
        lastEventIndex = i;
        break;
      }
    }

    if (lastEventIndex === -1) return;

    const lastEvent = scoreEvents[lastEventIndex];
    if (lastEvent.scoringSide !== side) return;

    const game = games[currentGame];
    if (!game) return;

    const updatedGames = [...games];
    updatedGames[currentGame] = {
      ...game,
      homeScore: Math.max(0, game.homeScore - (side === "home" ? 1 : 0)),
      awayScore: Math.max(0, game.awayScore - (side === "away" ? 1 : 0)),
      winner: null,
    };

    setGames(updatedGames);
    setScoreEvents(
      normalizeScoreTimelineEvents(scoreEvents.filter((_, index) => index !== lastEventIndex))
    );
    setMatchFinished(false);
  };

  // === Admin mode functions ===
  const updateAdminGame = (index: number, field: "homeScore" | "awayScore", value: string) => {
    setAdminGames((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // === Submit ===
  const submitScore = async () => {
    if (!match) return;
    setSubmitting(true);

    try {
      let gamesToSubmit: Array<{ homeScore: number; awayScore: number }>;

      if (isAdmin) {
        // Admin mode: validate direct input
        const validGames = adminGames.filter(
          (g) => g.homeScore !== "" && g.awayScore !== ""
        );

        if (validGames.length === 0) {
          toast.error(t("scoring.needOneGame"));
          setSubmitting(false);
          return;
        }

        for (const g of validGames) {
          const h = parseInt(g.homeScore, 10);
          const a = parseInt(g.awayScore, 10);
          if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
            toast.error(t("scoring.scoreNonNegative"));
            setSubmitting(false);
            return;
          }
          if (h === a) {
            toast.error(t("scoring.scoreNoTie"));
            setSubmitting(false);
            return;
          }
        }

        gamesToSubmit = validGames.map((g) => ({
          homeScore: parseInt(g.homeScore, 10),
          awayScore: parseInt(g.awayScore, 10),
        }));
      } else {
        // Athlete mode: use +1 scored games
        gamesToSubmit = games
          .filter((g) => g.winner !== null)
          .map((g) => ({
            homeScore: g.homeScore,
            awayScore: g.awayScore,
          }));

        if (gamesToSubmit.length === 0) {
          toast.error(t("scoring.matchNotFinished"));
          setSubmitting(false);
          return;
        }
      }

      const cleanedEvents = normalizeScoreTimelineEvents(scoreEvents);

      const res = await fetch(`/api/tournaments/${match.tournamentId}/matches/${match.id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          games: gamesToSubmit,
          refereePlayerId: refereeId ? Number(refereeId) : undefined,
          lineJudgePlayerId: lineJudgeId ? Number(lineJudgeId) : undefined,
          scoreEventLog: !isAdmin ? cleanedEvents : undefined,
        }),
      });

      if (res.ok) {
        clearDraft(matchId);
        toast.success(t("scoring.saved"));
        router.push(`/match/${match.id}`);
      } else {
        const err = await res.json() as ScoreApiError;
        toast.error(err.error || t("scoring.saveFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("scoring.loading")}</div>;
  if (!match) return <div className="text-center py-12 text-muted-foreground">{t("scoring.notFound")}</div>;

  const currentGameData = games[currentGame];
  const isEditingFinished = match.status === "finished";
  const canSubmit = isAdmin || (!isEditingFinished && matchFinished);
  const currentGameEvents = scoreEvents.filter((evt) => evt.gameNumber === currentGame + 1);
  const lastScoringSide = currentGameEvents[currentGameEvents.length - 1]?.scoringSide;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Match Info */}
      <div className="text-center">
        <Badge variant="outline" className="mb-2">
          {t("scoring.roundCourtType", { round: match.roundNumber, court: match.courtNumber, type: matchTypeLabel(t, match.matchType) })}
        </Badge>
        {isAdmin && (
          <Badge className="ml-2 bg-amber-100 text-amber-700 text-xs">{t("scoring.adminMode")}</Badge>
        )}
        {isEditingFinished && (
          <Badge className="ml-2 bg-rose-100 text-rose-700 text-xs">{t("scoring.editingFinished")}</Badge>
        )}
        <div className="flex items-center justify-center gap-4 text-lg font-medium mt-2">
          <span>{match.homeGroup.icon} {match.homeGroup.name}</span>
          <span className="text-muted-foreground">vs</span>
          <span>{match.awayGroup.icon} {match.awayGroup.name}</span>
        </div>
      </div>

      {/* Draft Recovery Banner */}
      {pendingDraft && (
        <Card className="border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 shrink-0">
                <RotateCcw className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-amber-800">{t("scoring.unfinishedDraft")}</div>
                <div className="text-xs text-amber-600/80 truncate">
                  {pendingDraft.games.filter(g => g.homeScore > 0 || g.awayScore > 0).map((g, i) => (
                    <span key={i}>
                      {i > 0 && " / "}
                      {t("scoring.gameScore", { n: i + 1, home: g.homeScore, away: g.awayScore })}
                    </span>
                  ))}
                  {" · "}
                  {new Date(pendingDraft.savedAt).toLocaleString(intlLocale, { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white h-8 px-3 text-xs"
                  onClick={() => restoreDraft(pendingDraft)}
                >
                  {t("scoring.restore")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-600/70 hover:text-amber-700 hover:bg-amber-100/60 h-8 w-8 p-0"
                  onClick={discardDraft}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referee Buttons */}
      <Card className="border-gray-100 shadow-sm">
        <CardContent className="pt-4 space-y-3">
          <div className="text-sm font-medium">{t("scoring.refereeSection")}</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              variant={refereeId ? "default" : "outline"}
              className={refereeId
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"}
              onClick={() => {
                if (refereeId) {
                  setRefereeId("");
                } else if (user?.playerId) {
                  setRefereeId(String(user.playerId));
                } else {
                  toast.error(t("scoring.refereeNeedsBinding"));
                }
              }}
            >
              {refereeId ? t("scoring.headReferee", { name: user?.username || t("scoring.me") }) : t("scoring.iAmReferee")}
            </Button>
            <Button
              variant={lineJudgeId ? "default" : "outline"}
              className={lineJudgeId
                ? "bg-teal-600 hover:bg-teal-700 text-white"
                : "border-teal-200 text-teal-600 hover:bg-teal-50"}
              onClick={() => {
                if (lineJudgeId) {
                  setLineJudgeId("");
                } else if (user?.playerId) {
                  setLineJudgeId(String(user.playerId));
                } else {
                  toast.error(t("scoring.refereeNeedsBinding"));
                }
              }}
            >
              {lineJudgeId ? t("scoring.lineJudge", { name: user?.username || t("scoring.me") }) : t("scoring.iAmLineJudge")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Mode: Direct Score Input */}
      {isAdmin ? (
        <Card className="border-amber-100 shadow-lg">
          <CardContent className="pt-5 space-y-4">
            <div className="text-sm font-medium text-gray-700">
              {isEditingFinished ? t("scoring.editScore") : t("scoring.directInput")}
            </div>
            {adminGames.map((game, i) => (
              <div key={i} className="flex items-center gap-3">
                {adminGames.length > 1 && (
                  <span className="text-xs text-muted-foreground w-14 shrink-0">{t("scoring.gameLabel", { n: i + 1 })}</span>
                )}
                <div className="flex-1">
                  <div className="text-xs text-center text-gray-400 mb-1">{match.homeGroup.icon} {match.homeGroup.name}</div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={t("scoring.homeScorePlaceholder")}
                    value={game.homeScore}
                    onChange={(e) => updateAdminGame(i, "homeScore", sanitizeIntegerInput(e.target.value))}
                    className="text-center font-bold text-lg"
                  />
                </div>
                <span className="text-gray-400 font-bold text-xl mt-5">:</span>
                <div className="flex-1">
                  <div className="text-xs text-center text-gray-400 mb-1">{match.awayGroup.icon} {match.awayGroup.name}</div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={t("scoring.awayScorePlaceholder")}
                    value={game.awayScore}
                    onChange={(e) => updateAdminGame(i, "awayScore", sanitizeIntegerInput(e.target.value))}
                    className="text-center font-bold text-lg"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Athlete Mode: Game tabs (for best of 3) */}
          {bestOf > 1 && (
            <div className="flex justify-center gap-2">
              {games.map((g, i) => (
                <Badge
                  key={i}
                  variant={i === currentGame ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => !g.winner && setCurrentGame(i)}
                >
                  {t("scoring.gameLabel", { n: i + 1 })}
                  {g.winner && ` ${g.homeScore}:${g.awayScore}`}
                </Badge>
              ))}
            </div>
          )}

          {/* Athlete Mode: +1 Scoring Interface */}
          <Card className="border-green-100 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                {/* Home Score */}
                <div className="p-6 text-center bg-gradient-to-b from-green-50/50 to-white">
                  <div className="text-sm text-gray-600 font-medium mb-2">{match.homeGroup.icon} {match.homeGroup.name}</div>
                  <div className="text-6xl font-bold text-green-600 my-6 tabular-nums">
                    {currentGameData.homeScore}
                  </div>
                  <div className="space-y-2">
                    <Button
                      size="lg"
                      className="w-full h-16 text-2xl bg-green-600 hover:bg-green-700 active:scale-95 transition-transform shadow-md"
                      onClick={() => addPoint("home")}
                      disabled={matchFinished || currentGameData.winner !== null}
                    >
                      +1
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => undoPoint("home")}
                      disabled={currentGameData.homeScore === 0 || lastScoringSide !== "home"}
                    >
                      {t("scoring.undo")}
                    </Button>
                  </div>
                </div>

                {/* Away Score */}
                <div className="p-6 text-center bg-gradient-to-b from-teal-50/50 to-white">
                  <div className="text-sm text-gray-600 font-medium mb-2">{match.awayGroup.icon} {match.awayGroup.name}</div>
                  <div className="text-6xl font-bold text-teal-600 my-6 tabular-nums">
                    {currentGameData.awayScore}
                  </div>
                  <div className="space-y-2">
                    <Button
                      size="lg"
                      className="w-full h-16 text-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 transition-transform shadow-md"
                      onClick={() => addPoint("away")}
                      disabled={matchFinished || currentGameData.winner !== null}
                    >
                      +1
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => undoPoint("away")}
                      disabled={currentGameData.awayScore === 0 || lastScoringSide !== "away"}
                    >
                      {t("scoring.undo")}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ScoreTimelineCard
            homeGroup={match.homeGroup}
            awayGroup={match.awayGroup}
            events={scoreEvents}
            live
            emptyMessage={t("scoring.timelineEmpty")}
          />

          {/* Match Result */}
          {matchFinished && (
            <Card className="border-green-200 bg-green-50 shadow-md">
              <CardContent className="py-4 text-center">
                <div className="text-lg font-bold text-green-700 mb-2 flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {t("scoring.matchOver")}
                </div>
                <div className="text-sm text-gray-600">
                  {games.filter((g) => g.winner !== null).map((g, i) => (
                    <span key={i}>
                      {i > 0 && " / "}
                      {g.homeScore}:{g.awayScore}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!isAdmin && isEditingFinished && (
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="py-4 text-center text-sm text-gray-500">
            {t("scoring.alreadySubmitted")}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {canSubmit && (
        <Button
          className={`w-full ${isEditingFinished ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          size="lg"
          onClick={submitScore}
          disabled={submitting}
        >
          <Send className="w-4 h-4 mr-1" />
          {submitting ? t("scoring.submitting") : isEditingFinished ? t("scoring.updateScore") : t("scoring.submitScore")}
        </Button>
      )}
    </div>
  );
}
