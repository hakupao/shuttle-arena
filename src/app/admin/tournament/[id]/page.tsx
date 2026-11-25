"use client";

export const runtime = "edge";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTournament } from "@/lib/tournament-context";
import { useT } from "@/i18n/provider";

export default function LegacyTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const t = useT();
  const { setCurrentId } = useTournament();

  useEffect(() => {
    const rawId = params.id;
    const nextId = typeof rawId === "string" ? parseInt(rawId, 10) : NaN;
    if (!Number.isNaN(nextId)) {
      setCurrentId(nextId);
    }
    router.replace("/admin/schedule");
  }, [params.id, router, setCurrentId]);

  return <div className="text-center py-12 text-gray-400">{t("admin.redirect.toSchedule")}</div>;
}
