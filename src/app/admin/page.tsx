"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Settings,
  Settings2,
  SlidersHorizontal,
  Users,
  CalendarDays,
  PenLine,
  Plus,
  Trash2,
  Play,
  Square,
  Shuffle,
  ArrowLeftRight,
  UserCog,
  Palette,
  Archive,
} from "lucide-react";
import { useTournament } from "@/lib/tournament-context";
import { useI18n } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/translate";

interface Tournament {
  id: number;
  name: string;
  status: string;
  courtsCount: number;
  eventDate: string | null;
}

interface TournamentListResponse {
  tournaments?: Tournament[];
}

interface TournamentCreateResponse {
  tournament: Tournament;
}

interface ErrorResponse {
  error?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-50 text-amber-600 border-amber-200",
  active: "bg-green-50 text-green-600 border-green-200",
  finished: "bg-gray-100 text-gray-500 border-gray-200",
  archived: "bg-blue-50 text-blue-600 border-blue-200",
};

const STATUS_LABEL_KEYS = {
  draft: "admin.statusDraft",
  active: "admin.statusActive",
  finished: "admin.statusFinished",
  archived: "admin.statusArchived",
} as const;

function statusLabelKey(status: string): MessageKey | null {
  return status in STATUS_LABEL_KEYS ? STATUS_LABEL_KEYS[status as keyof typeof STATUS_LABEL_KEYS] : null;
}

export default function AdminPage() {
  const { t, intlLocale } = useI18n();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { currentId, setCurrentId, refresh: refreshGlobal } = useTournament();

  const fetchTournaments = async () => {
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json() as TournamentListResponse;
      const list: Tournament[] = data.tournaments || [];
      setTournaments(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const createTournament = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: t("admin.defaultTournamentName", { date: new Date().toLocaleDateString(intlLocale) }),
          groupCount: 5,
        }),
      });
      if (res.ok) {
        const data = await res.json() as TournamentCreateResponse;
        toast.success(t("admin.createSuccess"));
        setCurrentId(data.tournament.id);
        fetchTournaments();
        refreshGlobal();
      } else {
        const err = await res.json() as ErrorResponse;
        toast.error(err.error || t("admin.createFailed"));
      }
    } finally {
      setCreating(false);
    }
  };

  const changeTournamentStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(t("admin.statusChanged", { status: statusLabelKey(newStatus) ? t(statusLabelKey(newStatus)!) : newStatus }));
        fetchTournaments();
        refreshGlobal();
      } else {
        const err = await res.json() as ErrorResponse;
        toast.error(err.error || t("admin.statusChangeFailed"));
      }
    } catch {
      toast.error(t("admin.networkError"));
    }
  };

  const deleteTournament = async (id: number, name: string) => {
    if (!confirm(t("admin.deleteConfirm", { name }))) return;

    try {
      const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("admin.deleted"));
        fetchTournaments();
        refreshGlobal();
      } else {
        toast.error(t("admin.deleteFailed"));
      }
    } catch {
      toast.error(t("admin.deleteFailed"));
    }
  };

  const selectedId = currentId;
  const selectedTournament = tournaments.find((tour) => tour.id === selectedId);

  const adminSections = selectedId ? [
    { icon: Settings2, titleKey: "admin.sections.settings", href: "/admin/settings", color: "text-emerald-600", accent: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50" },
    { icon: SlidersHorizontal, titleKey: "admin.sections.rules", href: "/admin/rules", color: "text-blue-600", accent: "border-blue-200 hover:border-blue-400 hover:bg-blue-50/50" },
    { icon: Palette, titleKey: "admin.sections.teams", href: "/admin/teams", color: "text-violet-600", accent: "border-violet-200 hover:border-violet-400 hover:bg-violet-50/50" },
    { icon: CalendarDays, titleKey: "admin.sections.schedule", href: "/admin/schedule", color: "text-amber-600", accent: "border-amber-200 hover:border-amber-400 hover:bg-amber-50/50" },
    { icon: Users, titleKey: "admin.sections.players", href: "/admin/players", color: "text-sky-600", accent: "border-sky-200 hover:border-sky-400 hover:bg-sky-50/50" },
    { icon: Shuffle, titleKey: "admin.sections.lottery", href: "/admin/lottery", color: "text-indigo-600", accent: "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50" },
    { icon: ArrowLeftRight, titleKey: "admin.sections.swap", href: "/admin/swap", color: "text-orange-600", accent: "border-orange-200 hover:border-orange-400 hover:bg-orange-50/50" },
    { icon: PenLine, titleKey: "admin.sections.scoring", href: "/admin/scoring", color: "text-rose-600", accent: "border-rose-200 hover:border-rose-400 hover:bg-rose-50/50" },
    { icon: UserCog, titleKey: "admin.sections.users", href: "/admin/users", color: "text-cyan-600", accent: "border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50/50" },
  ] as const : [];

  return (
    <div className="admin-page-medium">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-500" />
          <h1 className="text-xl font-bold text-gray-800">{t("admin.title")}</h1>
          <span className="text-xs text-gray-400">{t("admin.tournamentCount", { n: tournaments.length })}</span>
        </div>
        <Button
          onClick={createTournament}
          disabled={creating}
          size="sm"
          className="bg-green-600 px-3 text-white shadow-sm hover:bg-green-700 gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          {creating ? t("admin.creating") : t("admin.newTournament")}
        </Button>
      </div>

      {/* Tournament List */}
      {!loading && tournaments.length > 0 && (
        <div className="space-y-2">
          {tournaments.map((tour) => (
            <div
              key={tour.id}
              className={`squircle-card border px-4 py-3 cursor-pointer transition-all ${
                selectedId === tour.id
                  ? "border-green-400 bg-green-50/60 ring-1 ring-green-200"
                  : "border-gray-200 bg-white hover:border-green-300"
              }`}
              onClick={() => setCurrentId(tour.id)}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${selectedId === tour.id ? "bg-green-500" : "bg-gray-300"}`} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-800">{tour.name}</div>
                    <div className="mt-1 text-xs text-gray-400">{tour.eventDate || t("admin.dateTbd")} · {t("admin.courtsCount", { n: tour.courtsCount })}</div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 overflow-x-auto whitespace-nowrap sm:overflow-visible">
                  <span className={`inline-flex whitespace-nowrap squircle-pill border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[tour.status] || ""}`}>
                    {statusLabelKey(tour.status) ? t(statusLabelKey(tour.status)!) : tour.status}
                  </span>

                  {tour.status === "draft" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-xs text-green-600 hover:bg-green-50"
                      onClick={(e) => { e.stopPropagation(); changeTournamentStatus(tour.id, "active"); }}
                    >
                      <Play className="w-3 h-3" />
                      {t("admin.start")}
                    </Button>
                  )}
                  {tour.status === "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-xs text-gray-600 hover:bg-gray-50"
                      onClick={(e) => { e.stopPropagation(); changeTournamentStatus(tour.id, "finished"); }}
                    >
                      <Square className="w-3 h-3" />
                      {t("admin.end")}
                    </Button>
                  )}
                  {tour.status === "finished" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 text-xs text-blue-600 hover:bg-blue-50"
                        onClick={(e) => { e.stopPropagation(); if (confirm(t("admin.archiveConfirm"))) changeTournamentStatus(tour.id, "archived"); }}
                      >
                        <Archive className="w-3 h-3" />
                        {t("admin.archive")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 text-xs text-amber-600 hover:bg-amber-50"
                        onClick={(e) => { e.stopPropagation(); changeTournamentStatus(tour.id, "draft"); }}
                      >
                        {t("admin.reset")}
                      </Button>
                    </>
                  )}

                  {tour.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-gray-300 hover:bg-red-50 hover:text-red-500"
                      onClick={(e) => { e.stopPropagation(); deleteTournament(tour.id, tour.name); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Management Cards */}
      {selectedTournament && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <div className={`flex flex-col items-center gap-2.5 squircle-card border bg-white p-5 transition-all cursor-pointer ${section.accent}`}>
                  <Icon className={`w-6 h-6 ${section.color}`} />
                  <span className="text-sm font-medium text-gray-700">{t(section.titleKey)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && tournaments.length === 0 && (
        <div className="squircle-card border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
          <p className="text-gray-400 text-sm">{t("admin.empty")}</p>
        </div>
      )}
    </div>
  );
}
