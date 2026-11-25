"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { PositionBadge } from "@/components/player/position-label";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { toast } from "sonner";
import { useTournament } from "@/lib/tournament-context";
import { useI18n } from "@/i18n/provider";
import { Shuffle, Users, UserPlus, Trash2, Dices, Mars, Venus } from "lucide-react";

interface RegisteredUser {
  id: number;
  username: string;
  role: string;
  playerId: number | null;
}

interface Participant {
  id: number;
  tournamentId: number;
  userId: number;
  assignedPosition: number;
  gender: "M" | "F";
  username: string;
}

interface LotteryResult {
  playerId: number;
  userId: number;
  username: string;
  groupName: string;
  position: number;
}

interface ActionResponse {
  error?: string;
  message?: string;
  assignments?: LotteryResult[];
}

interface ParticipantsResponse {
  participants?: Participant[];
  malesPerGroup?: number;
  femalesPerGroup?: number;
  groupCount?: number;
}

interface UsersResponse {
  users?: RegisteredUser[];
}

export default function LotteryPage() {
  const { t, tNode } = useI18n();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const { currentId, loading: tournamentLoading } = useTournament();
  const tournamentId = currentId ? String(currentId) : "";

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [malesPerGroup, setMalesPerGroup] = useState(3);
  const [femalesPerGroup, setFemalesPerGroup] = useState(2);
  const [groupCount, setGroupCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadedTournamentId, setLoadedTournamentId] = useState<number | null>(null);
  const [lotteryRunning, setLotteryRunning] = useState(false);
  const [lotteryResults, setLotteryResults] = useState<LotteryResult[] | null>(null);

  // For adding new participant
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");

  const fetchData = useCallback(async () => {
    if (!tournamentId) {
      setLoadedTournamentId(null);
      setLoading(false);
      return;
    }
    const selectedTournamentId = currentId;
    try {
      const [partRes, usersRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/participants`),
        fetch("/api/users"),
      ]);

      if (!partRes.ok || !usersRes.ok) {
        throw new Error("Failed to load lottery data");
      }

      const [partData, usersData] = await Promise.all([
        partRes.json() as Promise<ParticipantsResponse>,
        usersRes.json() as Promise<UsersResponse>,
      ]);

      setParticipants(partData.participants || []);
      setMalesPerGroup(partData.malesPerGroup || 3);
      setFemalesPerGroup(partData.femalesPerGroup || 2);
      setGroupCount(partData.groupCount || 0);
      setRegisteredUsers(
        (usersData.users || []).filter((u: RegisteredUser) => u.role === "athlete")
      );
    } catch {
      toast.error(tRef.current("adminLottery.loadFailed"));
    } finally {
      if (selectedTournamentId !== undefined) {
        setLoadedTournamentId(selectedTournamentId ?? null);
      }
      setLoading(false);
    }
  }, [currentId, tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPerGroup = malesPerGroup + femalesPerGroup;
  const assignedUserIds = new Set(participants.map((p) => p.userId));

  const addParticipant = async () => {
    if (!selectedUserId || !selectedPosition || !selectedGender) {
      toast.error(t("adminLottery.selectAllRequired"));
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: [{
            userId: Number(selectedUserId),
            assignedPosition: Number(selectedPosition),
            gender: selectedGender,
          }],
        }),
      });

      if (res.ok) {
        toast.success(t("adminLottery.participantAdded"));
        setSelectedUserId("");
        setSelectedPosition("");
        setSelectedGender("");
        fetchData();
      } else {
        const err = await res.json() as ActionResponse;
        toast.error(err.error || t("adminLottery.addFailed"));
      }
    } catch {
      toast.error(t("adminLottery.networkError"));
    }
  };

  const removeParticipant = async (userId: number) => {
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants?userId=${userId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success(t("adminLottery.removed"));
        fetchData();
      }
    } catch {
      toast.error(t("adminLottery.removeFailed"));
    }
  };

  const runLottery = async () => {
    if (!confirm(t("adminLottery.confirmLottery"))) return;

    setLotteryRunning(true);
    setLotteryResults(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/lottery`, {
        method: "POST",
      });
      const data = await res.json() as ActionResponse;
      if (res.ok) {
        toast.success(data.message || t("adminLottery.lotteryDone"));
        setLotteryResults(data.assignments || []);
        fetchData();
      } else {
        toast.error(data.error || t("adminLottery.lotteryFailed"));
      }
    } catch {
      toast.error(t("adminLottery.networkError"));
    } finally {
      setLotteryRunning(false);
    }
  };

  if (tournamentLoading || (currentId !== null && loadedTournamentId !== currentId) || loading) {
    return <div className="text-center py-12 text-gray-400">{t("adminLottery.loading")}</div>;
  }

  if (!currentId) {
    return (
      <div className="admin-page-medium">
        <AdminPageHeader
          title={t("adminLottery.title")}
          icon={Shuffle}
          iconClassName="w-4.5 h-4.5 text-indigo-600"
        />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            {t("adminLottery.selectTournamentFirst")}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group participants by position for display
  const byPosition = new Map<number, Participant[]>();
  for (const p of participants) {
    const list = byPosition.get(p.assignedPosition) || [];
    list.push(p);
    byPosition.set(p.assignedPosition, list);
  }

  return (
    <div className="admin-page-medium">
      <AdminPageHeader
        title={t("adminLottery.title")}
        icon={Shuffle}
        iconClassName="w-4.5 h-4.5 text-indigo-600"
        actions={(
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md"
            onClick={runLottery}
            disabled={lotteryRunning || participants.length === 0}
          >
            <Dices className="w-4 h-4" />
            {lotteryRunning ? t("adminLottery.lotteryRunning") : t("adminLottery.startLottery")}
          </Button>
        )}
      />

      {/* Stats */}
      <div className="flex gap-4 flex-wrap text-sm text-gray-500">
        <span>{tNode("adminLottery.statRegistered", { n: <strong className="text-gray-800">{participants.length}</strong> })}</span>
        <span>{tNode("adminLottery.statTeams", { n: <strong className="text-gray-800">{groupCount}</strong> })}</span>
        <span>{tNode("adminLottery.statPerTeam", { m: <strong className="text-blue-600">{t("adminLottery.maleCount", { n: malesPerGroup })}</strong>, f: <strong className="text-pink-600">{t("adminLottery.femaleCount", { n: femalesPerGroup })}</strong> })}</span>
        <span>{tNode("adminLottery.statPerPosition", { n: <strong className="text-gray-800">{groupCount}</strong> })}</span>
      </div>

      {/* Add participant form */}
      <Card className="border-indigo-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-500" />
            {t("adminLottery.addParticipant")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_1fr] gap-3 items-end sm:grid-cols-[1fr_auto_auto_auto]">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("adminLottery.athlete")}</label>
              <Select value={selectedUserId} onValueChange={(v: string | null) => setSelectedUserId(v || "")}>
                <SelectTrigger className="h-9">
                  <span className="truncate">
                    {selectedUserId
                      ? registeredUsers.find((u) => String(u.id) === selectedUserId)?.username || t("adminLottery.choose")
                      : t("adminLottery.chooseAthlete")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {registeredUsers
                    .filter((u) => !assignedUserIds.has(u.id))
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.username}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("adminLottery.gender")}</label>
              <Select value={selectedGender} onValueChange={(v: string | null) => {
                setSelectedGender(v || "");
                setSelectedPosition(""); // reset position when gender changes
              }}>
                <SelectTrigger className="h-9">
                  <span className="inline-flex items-center gap-1">{selectedGender === "M" ? <><Mars className="w-3.5 h-3.5 shrink-0" />{t("adminLottery.male")}</> : selectedGender === "F" ? <><Venus className="w-3.5 h-3.5 shrink-0" />{t("adminLottery.female")}</> : t("adminLottery.choose")}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M"><span className="inline-flex items-center gap-1"><Mars className="w-3.5 h-3.5 shrink-0" />{t("adminLottery.male")}</span></SelectItem>
                  <SelectItem value="F"><span className="inline-flex items-center gap-1"><Venus className="w-3.5 h-3.5 shrink-0" />{t("adminLottery.female")}</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("adminLottery.positionNumber")}</label>
              <Select value={selectedPosition} onValueChange={(v: string | null) => setSelectedPosition(v || "")}>
                <SelectTrigger className="h-9">
                  <span>{selectedPosition ? t("adminLottery.positionSlot", { n: selectedPosition }) : t("adminLottery.choose")}</span>
                </SelectTrigger>
                <SelectContent>
                  {selectedGender === "M" &&
                    Array.from({ length: malesPerGroup }, (_, i) => i + 1).map((pos) => {
                      const count = byPosition.get(pos)?.length || 0;
                      return (
                        <SelectItem key={pos} value={String(pos)} disabled={count >= groupCount}>
                          {t("adminLottery.positionOption", { n: pos, count, total: groupCount })}
                        </SelectItem>
                      );
                    })}
                  {selectedGender === "F" &&
                    Array.from({ length: femalesPerGroup }, (_, i) => malesPerGroup + i + 1).map((pos) => {
                      const count = byPosition.get(pos)?.length || 0;
                      return (
                        <SelectItem key={pos} value={String(pos)} disabled={count >= groupCount}>
                          {t("adminLottery.positionOption", { n: pos, count, total: groupCount })}
                        </SelectItem>
                      );
                    })}
                  {!selectedGender && (
                    <SelectItem value="__" disabled>{t("adminLottery.selectGenderFirst")}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 h-9"
              onClick={addParticipant}
              disabled={!selectedUserId || !selectedPosition || !selectedGender}
            >
              {t("adminLottery.add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Participants by position */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          {t("adminLottery.assignedPositions")}
        </h2>

        {participants.length === 0 ? (
          <Card className="border-dashed border-gray-200">
            <CardContent className="py-8 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">{t("adminLottery.noParticipants")}</p>
              <p className="text-sm text-gray-400">{t("adminLottery.noParticipantsHint")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: totalPerGroup }, (_, i) => {
              const pos = i + 1;
              const isMale = pos <= malesPerGroup;
              const posParticipants = byPosition.get(pos) || [];

              return (
                <Card key={pos} className={`border ${isMale ? "border-blue-100" : "border-pink-100"}`}>
                  <CardHeader className={`pb-2 ${isMale ? "bg-blue-50/50" : "bg-pink-50/50"} border-b ${isMale ? "border-blue-100" : "border-pink-100"}`}>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <PositionBadge
                          gender={isMale ? "M" : "F"}
                          positionNumber={pos}
                          suffix={t("common.position.slotSuffix")}
                          className={isMale ? "border-blue-200 text-blue-600" : "border-pink-200 text-pink-600"}
                        />
                      </span>
                      <span className="text-xs text-gray-400">
                        {posParticipants.length}/{groupCount}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {posParticipants.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">{t("adminLottery.noMembers")}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {posParticipants.map((p) => (
                          <div key={p.id} className="flex items-center justify-between group">
                            <span className="text-sm text-gray-700">{p.username}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                              onClick={() => removeParticipant(p.userId)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Fill indicator */}
                    <div className="mt-2 w-full bg-gray-100 squircle-pill h-1">
                      <div
                        className={`h-1 squircle-pill transition-all ${isMale ? "bg-blue-400" : "bg-pink-400"}`}
                        style={{ width: `${groupCount > 0 ? (posParticipants.length / groupCount) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Lottery Results */}
      {lotteryResults && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Dices className="w-5 h-5 text-indigo-600" />
              {t("adminLottery.lotteryResults")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {lotteryResults.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white squircle-lg border border-indigo-100 px-3 py-2"
                >
                  <span className="font-medium text-gray-800">{r.username}</span>
                  <span className="text-sm text-indigo-600">
                    → {r.groupName} {t("adminLottery.positionSlot", { n: r.position })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
