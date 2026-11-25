import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import { I18N_BOOT_SCRIPT, I18N_PENDING_ATTR } from "./boot-script";

function run(cookie: string, languages: string[]) {
  const attrs = new Set<string>();
  const timers: (() => void)[] = [];
  runInNewContext(I18N_BOOT_SCRIPT, {
    document: {
      cookie,
      documentElement: {
        setAttribute: (name: string) => attrs.add(name),
        removeAttribute: (name: string) => attrs.delete(name),
      },
    },
    navigator: { languages, language: languages[0] },
    setTimeout: (fn: () => void) => timers.push(fn),
  });
  return { hidden: attrs.has(I18N_PENDING_ATTR), fireTimeout: () => timers.forEach((fn) => fn()), attrs };
}

describe("i18n boot script", () => {
  it("hides the page when the system language is a non-default locale", () => {
    expect(run("", ["ja-JP", "en"]).hidden).toBe(true);
    expect(run("", ["zh-CN"]).hidden).toBe(true);
  });

  it("does not hide for English or unsupported languages (both render as English)", () => {
    expect(run("", ["en-US"]).hidden).toBe(false);
    expect(run("", ["fr-FR", "de"]).hidden).toBe(false);
  });

  it("follows the stored cookie over the system language", () => {
    expect(run("token=x; locale=en", ["zh-CN"]).hidden).toBe(false);
    expect(run("locale=zh", ["en-US"]).hidden).toBe(true);
    expect(run("locale=%E0", ["ja"]).hidden).toBe(true); // malformed cookie falls back to system language
  });

  it("always reveals the page after the safety timeout", () => {
    const result = run("locale=ja", ["ja"]);
    result.fireTimeout();
    expect(result.attrs.has(I18N_PENDING_ATTR)).toBe(false);
  });
});
