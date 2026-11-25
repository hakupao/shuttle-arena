import { LOCALE_COOKIE, isLocale, parseAcceptLanguage, pickLocale, type Locale } from "./config";
import { createT, type TFunction } from "./translate";

/** Locale for an API request: the client's stored choice, else Accept-Language, else English. */
export function getRequestLocale(request: Request): Locale {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const entry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  // Valid values are plain ASCII, so no decoding: a malformed cookie simply fails isLocale.
  const stored = entry?.slice(LOCALE_COOKIE.length + 1);
  if (isLocale(stored)) return stored;
  return pickLocale(parseAcceptLanguage(request.headers.get("accept-language")));
}

export function getRequestT(request: Request): TFunction {
  return createT(getRequestLocale(request));
}
