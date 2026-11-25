"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { useTournament } from "@/lib/tournament-context";
import { useT } from "@/i18n/provider";

interface TournamentDetail {
  id: number;
  name: string;
  eventDate: string | null;
  startTime: string;
  endTime: string;
}

interface TournamentResponse {
  tournament?: TournamentDetail | null;
}

export default function AdminSettingsPage() {
  const t = useT();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const { currentId, refresh, loading: tournamentLoading } = useTournament();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedTournamentId, setLoadedTournamentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    eventDate: "",
    startTime: "09:00",
    endTime: "19:00",
  });

  const fetchTournament = useCallback(async () => {
    if (!currentId) {
      setTournament(null);
      setLoadedTournamentId(null);
      setLoading(false);
      return;
    }

    const selectedTournamentId = currentId;
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}`);
      const data = await res.json() as TournamentResponse;
      const nextTournament = data.tournament || null;
      setTournament(nextTournament);
      if (nextTournament) {
        setForm({
          name: nextTournament.name,
          eventDate: nextTournament.eventDate || "",
          startTime: nextTournament.startTime || "09:00",
          endTime: nextTournament.endTime || "19:00",
        });
      }
    } catch {
      toast.error(tRef.current("adminSettings.loadFailed"));
    } finally {
      setLoadedTournamentId(selectedTournamentId);
      setLoading(false);
    }
  }, [currentId]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const handleSave = async () => {
    if (!currentId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${currentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          eventDate: form.eventDate || null,
          startTime: form.startTime || "09:00",
          endTime: form.endTime || "19:00",
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error || t("adminSettings.saveFailed"));
        return;
      }

      toast.success(t("adminSettings.saved"));
      await refresh();
      await fetchTournament();
    } catch {
      toast.error(t("adminSettings.networkError"));
    } finally {
      setSaving(false);
    }
  };

  if (tournamentLoading || (currentId !== null && loadedTournamentId !== currentId) || loading) {
    return <div className="text-center py-12 text-gray-400">{t("adminSettings.loading")}</div>;
  }

  if (!currentId || !tournament) {
    return (
      <div className="admin-page-narrow">
        <AdminPageHeader title={t("adminSettings.title")} icon={Settings2} iconClassName="w-4.5 h-4.5 text-emerald-600" />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            {t("adminSettings.selectFirst")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page-narrow">
      <AdminPageHeader
        title={t("adminSettings.title")}
        icon={Settings2}
        iconClassName="w-4.5 h-4.5 text-emerald-600"
        actions={(
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? t("adminSettings.saving") : t("adminSettings.save")}
          </Button>
        )}
      />

      <Card className="border-gray-200">
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-sm">{t("adminSettings.name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-600 text-sm">{t("adminSettings.date")}</Label>
            <Input
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-gray-600 text-sm">{t("adminSettings.startTime")}</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-gray-600 text-sm">{t("adminSettings.endTime")}</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
