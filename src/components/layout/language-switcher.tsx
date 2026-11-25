"use client";

import { Languages } from "lucide-react";
import { LOCALES, LOCALE_LABELS, isLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  /** Icon-only trigger for narrow layouts. */
  compact?: boolean;
  className?: string;
}

export function LanguageSwitcher({ compact = false, className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label
      className={cn(
        "relative inline-flex h-8 items-center gap-1 squircle-pill border border-green-100 bg-white/80 px-2 text-xs font-medium text-gray-600 hover:border-green-300 transition-colors cursor-pointer",
        className
      )}
      title={t("common.language.label")}
    >
      <Languages className="h-3.5 w-3.5 shrink-0 text-green-700" aria-hidden="true" />
      {!compact && <span>{LOCALE_LABELS[locale]}</span>}
      {/* Native select over the trigger: keyboard and mobile pickers work for free. */}
      <select
        aria-label={t("common.language.label")}
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
