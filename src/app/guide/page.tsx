"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  CalendarDays,
  Trophy,
  ChevronRight,
  PenLine,
  BarChart3,
  BookOpen,
  LayoutList,
  Grid3X3,
  UserCheck,
  MessageCircleQuestion,
  Lightbulb,
  MapPin,
  Clock,
  Users,
  Heart,
  Star,
  Swords,
  Info,
  ExternalLink,
  Navigation,
  Copy,
  Check,
  BadgeJapaneseYen,
  Scale,
  Smartphone,
  ClipboardList,
  UserCog,
} from "lucide-react";
import { ShuttlecockIcon } from "@/components/brand/shuttlecock-icon";
import { useI18n, useT } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/translate";
import { matchTypeLabel } from "@/i18n/labels";

/* ─── Constants ─── */

const VENUE_NAME = "横浜市中スポーツセンター";
const VENUE_ADDRESS = "〒231-0801 神奈川県横浜市中区新山下３丁目１５−４";
const VENUE_MAP_URL = "https://maps.app.goo.gl/htG9mnukuM19Rbje7";
const VENUE_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3250.763169474074!2d139.65905507622304!3d35.43589634341119!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60185d3b3ddcec75%3A0xa4faa20ce7049b75!2z5qiq5rWc5biC5Lit44K544Od44O844OE44K744Oz44K_44O8!5e0!3m2!1sja!2sjp!4v1774331877827!5m2!1sja!2sjp";

/* ─── Sub-components ─── */

function SectionDivider({
  number,
  title,
  icon: Icon,
}: {
  number: string;
  title: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center justify-center w-7 h-7 squircle-control bg-green-600 text-white text-xs font-bold shadow-sm">
        {number}
      </div>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-green-600" />
        <h2 className="text-base font-bold text-gray-800 tracking-tight">
          {title}
        </h2>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-green-200 to-transparent" />
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 px-2 py-1 squircle-chip text-[11px] font-medium transition-all duration-200 ${
        copied
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-gray-50 text-gray-400 border border-gray-150 hover:bg-gray-100 hover:text-gray-600"
      }`}
      title={t("guide.copy.title", { label })}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          {t("guide.copy.copied")}
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          {t("guide.copy.copy")}
        </>
      )}
    </button>
  );
}

function StatBlock({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-0.5 px-3 py-2.5">
      <span className="text-base">{icon}</span>
      <span className="text-lg font-bold text-gray-800 leading-none">
        {value}
      </span>
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
    </div>
  );
}

function StepItem({
  n,
  title,
  subtitle,
  children,
  isLast = false,
}: {
  n: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 text-white font-bold text-sm flex items-center justify-center shadow-sm">
          {n}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-green-200 to-transparent mt-2" />
        )}
      </div>
      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="font-bold text-gray-800 text-sm">{title}</div>
        <div className="text-xs text-gray-400 mb-2">{subtitle}</div>
        {children}
      </div>
    </div>
  );
}

function QAItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2 mb-1.5">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold flex items-center justify-center mt-0.5">
          Q
        </span>
        <span className="text-sm font-medium text-gray-800 leading-snug">
          {q}
        </span>
      </div>
      <div className="flex items-start gap-2 ml-7">
        <span className="text-xs text-gray-500 leading-relaxed">{a}</span>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function GuidePage() {
  const { t, tNode } = useI18n();
  const strong = (key: MessageKey) => (
    <span className="font-semibold text-gray-700">{t(key)}</span>
  );
  const male = (n: number) => t("guide.slot.male", { n });
  const female = (n: number) => t("guide.slot.female", { n });

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-green-600 transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("guide.backHome")}
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 squircle-card bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center shadow-md">
            <Info className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              {t("guide.title")}
            </h1>
            <p className="text-xs text-gray-400">
              {t("guide.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Section 1: 比赛说明 ═══ */}
      <section className="mb-10">
        <SectionDivider number="01" title={t("guide.overview.sectionTitle")} icon={ShuttlecockIcon} />

        {/* Desktop: 2-column / Mobile: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Left: Date/Time/Scale */}
          <Card className="border-green-100/80 shadow-sm">
            <CardContent className="p-0">
              {/* Date highlight strip */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 squircle-t-card px-5 py-3">
                <div className="flex items-center gap-2 text-white/80 text-xs font-medium mb-0.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {t("guide.overview.dateLabel")}
                </div>
                <div className="text-white font-bold text-lg tracking-tight">
                  {t("guide.overview.date")}
                  <span className="text-white/70 font-medium text-sm ml-1.5">
                    {t("guide.overview.weekday")}
                  </span>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3.5">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">{t("guide.overview.timeLabel")}</div>
                    <div className="text-sm font-semibold text-gray-700">
                      12:00 - 18:30
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {t("guide.overview.warmup")}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">{t("guide.overview.scaleLabel")}</div>
                    <div className="text-sm font-semibold text-gray-700">
                      {t("guide.overview.scale")}
                    </div>
                    <div className="text-[11px] text-gray-400">{t("guide.overview.scaleTotal")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShuttlecockIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">{t("guide.overview.ballLabel")}</div>
                    <div className="text-sm font-semibold text-gray-700">
                      YONEX エアロセンサ500
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BadgeJapaneseYen className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">{t("guide.overview.feeLabel")}</div>
                    <div className="text-sm font-semibold text-gray-700">
                      ¥1,500
                      <span className="text-[11px] font-normal text-gray-400 ml-1">{t("guide.overview.perPerson")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Venue + Map */}
          <Card className="border-green-100/80 shadow-sm">
            <CardContent className="p-0">
              {/* Map */}
              <div className="squircle-t-card overflow-hidden">
                <iframe
                  src={VENUE_EMBED_URL}
                  className="w-full h-40 lg:h-44"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={t("guide.overview.mapTitle")}
                />
              </div>
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-700">
                          {VENUE_NAME}
                        </span>
                        <CopyButton text={VENUE_NAME} label={t("guide.overview.venueNameLabel")} />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {t("guide.overview.venueRoom")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 break-all">
                        {VENUE_ADDRESS}
                      </span>
                      <CopyButton text={VENUE_ADDRESS} label={t("guide.overview.addressLabel")} />
                    </div>
                    <a
                      href={VENUE_MAP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 squircle-control text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors mt-1"
                    >
                      <Navigation className="w-3 h-3" />
                      {t("guide.overview.openMap")}
                      <ExternalLink className="w-3 h-3 opacity-40" />
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stat bar */}
        <Card className="border-gray-100 shadow-sm mb-4">
          <CardContent className="py-0 px-0">
            <div className="flex items-stretch divide-x divide-gray-100">
              <StatBlock value="10" label={t("guide.stats.perPlayer")} icon="👤" />
              <StatBlock value="75" label={t("guide.stats.totalMatches")} icon="🏸" />
              <StatBlock value="3" label={t("guide.stats.courts")} icon="🏟️" />
            </div>
          </CardContent>
        </Card>

        {/* Format + Rules — Desktop: 2 cols / Mobile: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: 赛制 + 分组 */}
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="py-4 px-5 space-y-4">
              <div>
                <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-green-500" />
                  {t("guide.format.title")}
                </div>
                <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
                  <p>
                    {tNode("guide.format.intro", {
                      format: strong("guide.format.formatName"),
                      men: strong("guide.format.men"),
                      women: strong("guide.format.women"),
                    })}
                  </p>
                  <p>
                    {tNode("guide.format.perRound", {
                      count: strong("guide.format.perRoundCount"),
                    })}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {[
                      {
                        type: "MD",
                        count: 2,
                        color: "bg-blue-50 text-blue-700 border-blue-200",
                      },
                      {
                        type: "WD",
                        count: 1,
                        color: "bg-pink-50 text-pink-700 border-pink-200",
                      },
                      {
                        type: "XD",
                        count: 2,
                        color: "bg-purple-50 text-purple-700 border-purple-200",
                      },
                    ].map((item) => (
                      <span
                        key={item.type}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 squircle-pill text-[11px] font-medium border ${item.color}`}
                      >
                        {t("guide.format.typeCount", {
                          type: matchTypeLabel(t, item.type),
                          count: item.count,
                        })}
                      </span>
                    ))}
                  </div>

                  <p className="mt-3">{t("guide.format.lineupIntro")}</p>
                  <div className="mt-1.5 space-y-1">
                    {[
                      { type: "MD", color: "bg-blue-100 text-blue-700 border-blue-200", players: [male(1), male(2)] },
                      { type: "MD", color: "bg-blue-100 text-blue-700 border-blue-200", players: [male(2), male(3)] },
                      { type: "XD", color: "bg-purple-100 text-purple-700 border-purple-200", players: [male(1), female(1)] },
                      { type: "XD", color: "bg-purple-100 text-purple-700 border-purple-200", players: [male(3), female(2)] },
                      { type: "WD", color: "bg-pink-100 text-pink-700 border-pink-200", players: [female(1), female(2)] },
                    ].map((match, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 squircle-pill text-[10px] font-bold border ${match.color} w-10 justify-center`}>
                          {t(`guide.format.typeShort.${match.type}` as MessageKey)}
                        </span>
                        <span className="text-xs text-gray-600 font-medium">{t("guide.format.pair", { a: match.players[0], b: match.players[1] })}</span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3">
                    {tNode("guide.format.appearances", {
                      count: strong("guide.format.appearancesCount"),
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: 计分规则 + 分组与抽签 */}
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="py-4 px-5 space-y-4">
              <div>
                <div className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  {t("guide.scoring.title")}
                </div>
                <div className="space-y-3 text-xs text-gray-500 leading-relaxed">
                  <div className="p-3 squircle-lg bg-amber-50/60 border border-amber-100">
                    <div className="text-xs font-semibold text-amber-800 mb-1">
                      {t("guide.scoring.singleTitle")}
                    </div>
                    <p className="text-amber-700/80">
                      {tNode("guide.scoring.single", {
                        format: (
                          <span className="font-bold text-amber-800">
                            {t("guide.scoring.singleFormat")}
                          </span>
                        ),
                        noDeuce: (
                          <span className="font-bold text-amber-800">
                            {t("guide.scoring.noDeuce")}
                          </span>
                        ),
                      })}
                    </p>
                  </div>

                  <div className="p-3 squircle-lg bg-gray-50 border border-gray-100">
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      {t("guide.scoring.teamTitle")}
                    </div>
                    <p className="text-gray-500 mb-2">
                      {t("guide.scoring.teamDesc")}
                    </p>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 squircle-control text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                        {t("guide.scoring.win")}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 squircle-control text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                        {t("guide.scoring.loss")}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 squircle-lg bg-gray-50 border border-gray-100">
                    <div className="text-xs font-semibold text-gray-700 mb-1">
                      {t("guide.scoring.tiebreakTitle")}
                    </div>
                    <p className="text-gray-500">
                      {tNode("guide.scoring.tiebreak", {
                        order: strong("guide.scoring.tiebreakOrder"),
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  {t("guide.draw.title")}
                </div>
                <div className="space-y-1 text-xs text-gray-500 leading-relaxed">
                  <p>
                    {tNode("guide.draw.method", {
                      method: strong("guide.draw.methodName"),
                    })}
                  </p>
                  <p>{t("guide.draw.codes")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 位置说明 — Full width below */}
        <Card className="border-gray-100 shadow-sm mt-4">
          <CardContent className="py-4 px-5">
            <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              {t("guide.positions.title")}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              {t("guide.positions.intro")}
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="p-3 squircle-lg bg-blue-50/50 border border-blue-100/80">
                <div className="text-[11px] font-semibold text-blue-800 mb-1.5">{t("guide.positions.maleTitle")}</div>
                <div className="space-y-1.5 text-[11px] text-blue-700/80">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-800 w-7 flex-shrink-0">{male(1)}</span>
                    <span>{t("guide.positions.M1")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-800 w-7 flex-shrink-0">{male(2)}</span>
                    <span>{t("guide.positions.M2")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-800 w-7 flex-shrink-0">{male(3)}</span>
                    <span>{t("guide.positions.M3")}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 squircle-lg bg-pink-50/50 border border-pink-100/80">
                <div className="text-[11px] font-semibold text-pink-800 mb-1.5">{t("guide.positions.femaleTitle")}</div>
                <div className="space-y-1.5 text-[11px] text-pink-700/80">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-pink-800 w-7 flex-shrink-0">{female(1)}</span>
                    <span>{t("guide.positions.W1")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-pink-800 w-7 flex-shrink-0">{female(2)}</span>
                    <span>{t("guide.positions.W2")}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 裁判与记分 — Full width below */}
        <Card className="border-gray-100 shadow-sm mt-4">
          <CardContent className="py-4 px-5">
            <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Scale className="w-4 h-4 text-green-500" />
              {t("guide.referee.title")}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              {t("guide.referee.intro")}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
              {/* 裁判安排 */}
              <div className="p-3 squircle-lg bg-indigo-50/50 border border-indigo-100/80">
                <div className="text-[11px] font-semibold text-indigo-800 mb-1.5 flex items-center gap-1.5">
                  <UserCog className="w-3 h-3" />
                  {t("guide.referee.arrangeTitle")}
                </div>
                <div className="space-y-1.5 text-[11px] text-indigo-700/80">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-800 flex-shrink-0">{t("guide.referee.umpire")}</span>
                    <span>
                      {tNode("guide.referee.umpireDesc", {
                        side: <span className="font-semibold text-indigo-800">{t("guide.referee.loserSide")}</span>,
                      })}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-800 flex-shrink-0">{t("guide.referee.lineJudge")}</span>
                    <span>
                      {tNode("guide.referee.lineJudgeDesc", {
                        side: <span className="font-semibold text-indigo-800">{t("guide.referee.winnerSide")}</span>,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 记分方式 */}
              <div className="p-3 squircle-lg bg-teal-50/50 border border-teal-100/80">
                <div className="text-[11px] font-semibold text-teal-800 mb-1.5 flex items-center gap-1.5">
                  <ClipboardList className="w-3 h-3" />
                  {t("guide.referee.methodTitle")}
                </div>
                <div className="space-y-1.5 text-[11px] text-teal-700/80">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-teal-800 flex-shrink-0">{t("guide.referee.paper")}</span>
                    <span>{t("guide.referee.paperDesc")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-teal-800 flex-shrink-0">{t("guide.referee.phone")}</span>
                    <span>{t("guide.referee.phoneDesc")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 在线记分流程 */}
            <div className="p-3 squircle-lg bg-gray-50 border border-gray-100">
              <div className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Smartphone className="w-3 h-3 text-green-600" />
                {t("guide.referee.flowTitle")}
              </div>
              <div className="space-y-2 text-[11px] text-gray-500">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                  <span>
                    {tNode("guide.referee.step1", {
                      umpireButton: strong("guide.referee.umpireButton"),
                      lineButton: strong("guide.referee.lineButton"),
                    })}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                  <span>
                    {tNode("guide.referee.step2", {
                      action: strong("guide.referee.step2Action"),
                    })}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">3</span>
                  <span>
                    {tNode("guide.referee.step3", {
                      restore: strong("guide.referee.step3Restore"),
                    })}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">4</span>
                  <span>
                    {tNode("guide.referee.step4", {
                      submit: strong("guide.referee.step4Submit"),
                    })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ═══ Section 2: 奖品设置 ═══ */}
      <section className="mb-10">
        <SectionDivider number="02" title={t("guide.prizes.title")} icon={Trophy} />

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
          {([
            {
              rankKey: "guide.prizes.champion",
              descKey: "guide.prizes.place1",
              gradient:
                "bg-gradient-to-br from-amber-500 to-yellow-400",
              emoji: "🏆",
              prizeKeys: ["guide.prizes.towel", "guide.prizes.socks", "guide.prizes.grip"],
            },
            {
              rankKey: "guide.prizes.runnerUp",
              descKey: "guide.prizes.place2",
              gradient: "bg-gradient-to-br from-gray-400 to-gray-300",
              emoji: "🥈",
              prizeKeys: ["guide.prizes.towel", "guide.prizes.socks"],
            },
            {
              rankKey: "guide.prizes.third",
              descKey: "guide.prizes.place3",
              gradient:
                "bg-gradient-to-br from-amber-700 to-amber-600",
              emoji: "🥉",
              prizeKeys: ["guide.prizes.towel", "guide.prizes.grip"],
            },
          ] as const).map((prize) => (
            <div
              key={prize.rankKey}
              className={`squircle-card p-3 sm:p-4 ${prize.gradient} relative overflow-hidden`}
            >
              <div className="absolute top-1 right-2 text-2xl sm:text-3xl opacity-25">
                {prize.emoji}
              </div>
              <div className="relative z-10">
                <div className="text-[11px] font-bold text-white/70">
                  {t(prize.rankKey)}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {prize.prizeKeys.map((item) => (
                    <div
                      key={item}
                      className="text-[10px] sm:text-[11px] font-medium text-white/90 leading-snug"
                    >
                      {t(item)}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-white/50 mt-1.5">
                  {t(prize.descKey)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2.5 px-4 py-3 squircle-card bg-gray-50 border border-gray-100">
            <span className="text-base mt-0.5">🎖️</span>
            <div>
              <div className="text-sm font-medium text-gray-700">{t("guide.prizes.places4to6")}</div>
              <div className="text-xs text-gray-600 mt-0.5">{t("guide.prizes.places4to6Prize")}</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 px-4 py-3 squircle-card bg-gray-50 border border-gray-100">
            <span className="text-base mt-0.5">🎁</span>
            <div>
              <div className="text-sm font-medium text-gray-700">{t("guide.prizes.participation")}</div>
              <div className="text-xs text-gray-600 mt-0.5">{t("guide.prizes.participationPrize")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Section 3: 赞助支持 ═══ */}
      <section className="mb-10">
        <SectionDivider number="03" title={t("guide.sponsor.title")} icon={Heart} />

        {/* Sponsor card — understated community style */}
        <div className="relative squircle-panel overflow-hidden bg-[#fafaf9] border border-gray-100/80">
          {/* SVG defs for squircle clip */}
          <svg className="absolute" width="0" height="0" aria-hidden="true">
            <defs>
              <clipPath id="squircle-clip" clipPathUnits="objectBoundingBox">
                <path d="M 0.5,0 C 0.83,0 1,0.17 1,0.5 C 1,0.83 0.83,1 0.5,1 C 0.17,1 0,0.83 0,0.5 C 0,0.17 0.17,0 0.5,0 Z" />
              </clipPath>
            </defs>
          </svg>

          <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
            {/* Club name — primary identity */}
            <div className="flex items-center gap-2 mb-4">
              <ShuttlecockIcon className="w-3.5 h-3.5 text-green-600/70" />
              <span className="text-[13px] sm:text-sm font-semibold text-gray-700 tracking-tight">
                {t("guide.sponsor.club")}
              </span>
            </div>

            {/* Person row */}
            <div className="flex items-center gap-3.5">
              {/* Superellipse avatar */}
              <div
                className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 overflow-hidden bg-gray-200"
                style={{ clipPath: "url(#squircle-clip)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sponsor-avatar.jpg"
                  alt={t("guide.sponsor.name")}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-700 leading-tight">
                  {t("guide.sponsor.name")}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {t("guide.sponsor.desc")}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="px-5 py-2.5 sm:px-6 border-t border-gray-100/60 bg-[#f7f7f5]">
            <p className="text-[10px] text-gray-500 tracking-[0.02em]">
              {t("guide.sponsor.thanks")}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ Section 4: 系统使用说明 ═══ */}
      <section className="mb-10">
        <SectionDivider number="04" title={t("guide.usage.title")} icon={BookOpen} />

        <Card className="border-gray-100 shadow-sm">
          <CardContent className="py-5 px-5">
            <StepItem n={1} title={t("guide.usage.schedule.title")} subtitle={t("guide.usage.schedule.subtitle")}>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <Grid3X3 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    {tNode("guide.usage.item", {
                      name: <span className="font-medium text-gray-700">{t("guide.usage.schedule.matrix")}</span>,
                      desc: t("guide.usage.schedule.matrixDesc"),
                    })}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <LayoutList className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    {tNode("guide.usage.item", {
                      name: <span className="font-medium text-gray-700">{t("guide.usage.schedule.list")}</span>,
                      desc: t("guide.usage.schedule.listDesc"),
                    })}
                  </span>
                </div>
                <div className="text-[11px] text-green-600 bg-green-50 squircle-sm px-2.5 py-1.5 mt-2">
                  {t("guide.usage.schedule.highlight")}
                </div>
              </div>
            </StepItem>

            <StepItem
              n={2}
              title={t("guide.usage.standings.title")}
              subtitle={t("guide.usage.standings.subtitle")}
            >
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <Trophy className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>
                    {tNode("guide.usage.item", {
                      name: <span className="font-medium text-gray-700">{t("guide.usage.standings.team")}</span>,
                      desc: t("guide.usage.standings.teamDesc"),
                    })}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>
                    {tNode("guide.usage.item", {
                      name: <span className="font-medium text-gray-700">{t("guide.usage.standings.stats")}</span>,
                      desc: t("guide.usage.standings.statsDesc"),
                    })}
                  </span>
                </div>
              </div>
            </StepItem>

            <StepItem
              n={3}
              title={t("guide.usage.myMatches.title")}
              subtitle={t("guide.usage.myMatches.subtitle")}
            >
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <UserCheck className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  {t("guide.usage.myMatches.desc")}
                </span>
              </div>
            </StepItem>

            <StepItem
              n={4}
              title={t("guide.usage.scoring.title")}
              subtitle={t("guide.usage.scoring.subtitle")}
              isLast
            >
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <PenLine className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>
                  {tNode("guide.usage.scoring.desc", {
                    plus: <span className="font-medium text-blue-600"> +1 </span>,
                  })}
                </span>
              </div>
            </StepItem>
          </CardContent>
        </Card>
      </section>

      {/* ═══ Section 5: 小贴士 ═══ */}
      <section className="mb-10">
        <SectionDivider number="05" title={t("guide.tips.title")} icon={Lightbulb} />
        <div className="space-y-2">
          {(["guide.tips.tip1", "guide.tips.tip2", "guide.tips.tip3"] as const).map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 px-4 py-2.5 squircle-lg bg-green-50/50 border border-green-100/60"
            >
              <ChevronRight className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-gray-600 leading-relaxed">
                {t(tip)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Section 6: 常见问题 ═══ */}
      <section className="mb-8">
        <SectionDivider
          number="06"
          title={t("guide.faq.title")}
          icon={MessageCircleQuestion}
        />
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="py-4 px-5 divide-y divide-gray-100">
            <QAItem
              q={t("guide.faq.q1")}
              a={t("guide.faq.a1")}
            />
            <QAItem
              q={t("guide.faq.q2")}
              a={t("guide.faq.a2")}
            />
            <QAItem
              q={t("guide.faq.q3")}
              a={t("guide.faq.a3")}
            />
            <QAItem
              q={t("guide.faq.q4")}
              a={t("guide.faq.a4")}
            />
            <QAItem
              q={t("guide.faq.q5")}
              a={t("guide.faq.a5")}
            />
            <QAItem
              q={t("guide.faq.q6")}
              a={t("guide.faq.a6")}
            />
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <div className="text-center pt-2">
        <Link href="/">
          <Button className="bg-green-600 hover:bg-green-700 text-white font-bold h-11 px-8 gap-2 shadow-md">
            <ShuttlecockIcon className="w-4 h-4" />
            {t("guide.cta")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
