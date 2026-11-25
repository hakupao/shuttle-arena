import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { matchLocale, parseAcceptLanguage, pickLocale } from "./config";
import { getRequestLocale } from "./server";
import { createT, createTNode } from "./translate";

describe("locale detection", () => {
  it("maps regional tags to supported locales", () => {
    expect(matchLocale("zh-TW")).toBe("zh");
    expect(matchLocale("ja-JP")).toBe("ja");
    expect(matchLocale("en_GB")).toBe("en");
    expect(matchLocale("fr-FR")).toBeNull();
    expect(matchLocale(undefined)).toBeNull();
  });

  it("picks the first supported preference, else English", () => {
    expect(pickLocale(["fr-FR", "ja", "zh-CN"])).toBe("ja");
    expect(pickLocale(["fr-FR", "de"])).toBe("en");
    expect(pickLocale([])).toBe("en");
  });

  it("orders Accept-Language by q-value", () => {
    expect(parseAcceptLanguage("fr;q=0.9, ja;q=0.95, *;q=0.1")).toEqual(["ja", "fr"]);
    expect(parseAcceptLanguage("zh-CN,zh;q=0.9,en;q=0.8")).toEqual(["zh-CN", "zh", "en"]);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });

  it("prefers the locale cookie over Accept-Language for API requests", () => {
    const withCookie = new Request("http://x/api", {
      headers: { cookie: "token=abc; locale=ja", "accept-language": "zh-CN" },
    });
    expect(getRequestLocale(withCookie)).toBe("ja");

    const headerOnly = new Request("http://x/api", { headers: { "accept-language": "zh-CN,en;q=0.5" } });
    expect(getRequestLocale(headerOnly)).toBe("zh");

    const bogusCookie = new Request("http://x/api", { headers: { cookie: "locale=xx", "accept-language": "de" } });
    expect(getRequestLocale(bogusCookie)).toBe("en");

    // Undecodable values must not throw (previously decodeURIComponent raised URIError).
    const malformed = new Request("http://x/api", { headers: { cookie: "locale=%E0", "accept-language": "ja" } });
    expect(getRequestLocale(malformed)).toBe("ja");
  });
});

describe("translate", () => {
  it("resolves keys per locale and interpolates params", () => {
    expect(createT("zh")("common.nav.home")).toBe("首页");
    expect(createT("ja")("common.defaultTeams.numbered", { n: 21 })).toBe("チーム21");
    expect(createT("en")("common.defaultTeams.numbered", { n: 21 })).toBe("Team 21");
  });

  it("leaves unknown placeholders intact", () => {
    expect(createT("en")("common.defaultTeams.numbered", {})).toBe("Team {n}");
  });

  it("tNode interleaves React nodes into the message", () => {
    const node = createTNode("en")("common.defaultTeams.numbered", { n: createElement("b", null, 7) });
    expect(renderToStaticMarkup(createElement("p", null, node))).toBe("<p>Team <b>7</b></p>");
  });
});
