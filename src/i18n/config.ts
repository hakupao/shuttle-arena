export const LOCALES = ["zh", "ja", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Used when neither a stored choice nor the system language matches a supported locale. */
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie holding the user's locale; read by the client provider and by API routes. */
export const LOCALE_COOKIE = "locale";

/** BCP 47 tags for `<html lang>` and `Intl` / `toLocale*` formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  zh: "zh-CN",
  ja: "ja-JP",
  en: "en-US",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  zh: "中文",
  ja: "日本語",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Maps a language tag such as "zh-TW", "ja-JP" or "en-GB" to a supported locale. */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(primary) ? primary : null;
}

/** First supported entry of a preference list, else the default locale. */
export function pickLocale(tags: readonly (string | null | undefined)[]): Locale {
  for (const tag of tags) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

/** Parses an Accept-Language header into tags ordered by q-value. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.tag);
}
