import type { TFunction } from "@/i18n/translate";

const USERNAME_MIN_LENGTH = 2;
const PASSWORD_MIN_LENGTH = 8;

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizePassword(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function validateUsername(username: string, t: TFunction) {
  if (!username) return t("api.usernameRequired");
  if (username.length < USERNAME_MIN_LENGTH) {
    return t("api.usernameMin", { min: USERNAME_MIN_LENGTH });
  }
  return null;
}

export function validatePassword(password: string, t: TFunction, label = t("api.labelPassword")) {
  if (!password) return t("api.fieldRequired", { label });
  if (password.length < PASSWORD_MIN_LENGTH) {
    return t("api.fieldMin", { label, min: PASSWORD_MIN_LENGTH });
  }
  return null;
}
