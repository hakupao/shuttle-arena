"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTournament } from "@/lib/tournament-context";
import { useT } from "@/i18n/provider";

export default function TournamentRedirectPage() {
  const router = useRouter();
  const t = useT();
  const { currentId, loading } = useTournament();

  useEffect(() => {
    if (!loading) {
      router.replace(currentId ? "/admin/schedule" : "/admin");
    }
  }, [currentId, loading, router]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{t("admin.redirect.loading")}</div>;
  }

  return <div className="text-center py-12 text-muted-foreground">{t("admin.redirect.redirecting")}</div>;
}
