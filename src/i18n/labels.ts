import type { MessageKey, TFunction } from "./translate";

const MATCH_TYPES = ["MD", "WD", "XD"] as const;
const SCORING_MODE_KEYS = ["single_21", "single_30", "best_of_3_15", "best_of_3_21"] as const;

/** Display name for a match type code ("MD" / "WD" / "XD"); unknown codes are shown as-is. */
export function matchTypeLabel(t: TFunction, matchType: string): string {
  return (MATCH_TYPES as readonly string[]).includes(matchType)
    ? t(`common.matchType.${matchType}` as MessageKey)
    : matchType;
}

/** Display name for a scoring mode id such as "best_of_3_21"; unknown ids are shown as-is. */
export function scoringModeLabel(t: TFunction, mode: string): string {
  return (SCORING_MODE_KEYS as readonly string[]).includes(mode)
    ? t(`common.scoringMode.${mode}` as MessageKey)
    : mode;
}
