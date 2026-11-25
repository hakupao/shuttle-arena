import { createT } from "@/i18n/translate";
import { describe, it, expect } from "vitest";
import {
  validatePassword,
  validateUsername,
  normalizeUsername,
  normalizePassword,
} from "./account-validation";

const t = createT("zh");

describe("validatePassword — minimum length raised to 8", () => {
  it("rejects an empty password", () => {
    expect(validatePassword("", t)).not.toBeNull();
  });

  it("rejects passwords shorter than 8 characters (the old 4-char minimum is gone)", () => {
    for (const pw of ["a", "abc", "1234", "seven77"]) {
      expect(validatePassword(pw, t), `"${pw}" should be rejected`).not.toBeNull();
    }
  });

  it("accepts passwords of 8 or more characters", () => {
    expect(validatePassword("12345678", t)).toBeNull();
    expect(validatePassword("a-longer-passphrase", t)).toBeNull();
  });

  it("uses the provided label in the error message", () => {
    expect(validatePassword("x", t, "新密码")).toContain("新密码");
  });
});

describe("validateUsername", () => {
  it("rejects empty and 1-char usernames", () => {
    expect(validateUsername("", t)).not.toBeNull();
    expect(validateUsername("a", t)).not.toBeNull();
  });

  it("accepts usernames of 2+ characters", () => {
    expect(validateUsername("ab", t)).toBeNull();
    expect(validateUsername("player_one", t)).toBeNull();
  });
});

describe("normalizers", () => {
  it("normalizeUsername trims and coerces non-strings to empty", () => {
    expect(normalizeUsername("  bob  ")).toBe("bob");
    expect(normalizeUsername(42)).toBe("");
    expect(normalizeUsername(undefined)).toBe("");
  });

  it("normalizePassword keeps strings verbatim, coerces non-strings to empty", () => {
    expect(normalizePassword("  spaces kept  ")).toBe("  spaces kept  ");
    expect(normalizePassword(null)).toBe("");
  });
});
