"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, INTL_LOCALE, LOCALE_COOKIE, isLocale, pickLocale, type Locale } from "./config";
import { createT, createTNode, type TFunction, type TNodeFunction } from "./translate";
import { I18N_PENDING_ATTR } from "./boot-script";

interface I18nContextValue {
  locale: Locale;
  /** BCP 47 tag for Intl / toLocale* calls, e.g. "ja-JP". */
  intlLocale: string;
  setLocale: (locale: Locale) => void;
  t: TFunction;
  tNode: TNodeFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readLocaleCookie(): Locale | null {
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  // Valid values are plain ASCII, so no decoding: a malformed cookie simply fails isLocale.
  const value = entry?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(value) ? value : null;
}

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

/**
 * Pages are prerendered statically, so the server and the first client render
 * both use DEFAULT_LOCALE; the real locale is applied after mount. Reading
 * cookies or navigator during render would cause hydration mismatches.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    const initial = readLocaleCookie() ?? pickLocale(navigator.languages ?? [navigator.language]);
    // The cookie also tells API routes which language to answer errors in.
    writeLocaleCookie(initial);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- locale is only knowable after mount
    setLocaleState(initial);
    setDetected(true);
  }, []);

  // Runs after the re-render in the detected locale has committed, so the boot
  // script's hidden page is revealed already translated.
  useEffect(() => {
    if (detected) document.documentElement.removeAttribute(I18N_PENDING_ATTR);
  }, [detected]);

  const t = useMemo(() => createT(locale), [locale]);
  const tNode = useMemo(() => createTNode(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = INTL_LOCALE[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    writeLocaleCookie(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, intlLocale: INTL_LOCALE[locale], setLocale, t, tNode }),
    [locale, setLocale, t, tNode]
  );

  return (
    <I18nContext.Provider value={value}>
      {/* React 19 hoists <title> into <head>; rendering it here keeps it in step with the locale
          (setting document.title in an effect loses to Next's streamed metadata on first load). */}
      <title>{t("common.meta.title")}</title>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}

/** Shorthand for components that only need `t`. */
export function useT(): TFunction {
  return useI18n().t;
}
