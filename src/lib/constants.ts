import type { MessageKey, TFunction } from "@/i18n/translate";

// 默认代号库（创建时按创建者的语言写入，之后可在赛事设置中完全自定义）
const DEFAULT_TEAM_ICONS = [
  { icon: "🐱", key: "cat" },
  { icon: "🐶", key: "dog" },
  { icon: "🐰", key: "rabbit" },
  { icon: "🐼", key: "panda" },
  { icon: "🐹", key: "hamster" },
  { icon: "🦝", key: "raccoon" },
  { icon: "🐨", key: "koala" },
  { icon: "🦔", key: "hedgehog" },
  { icon: "🦦", key: "otter" },
  { icon: "🐧", key: "penguin" },
  { icon: "🦊", key: "fox" },
  { icon: "🐻", key: "bear" },
  { icon: "🐸", key: "frog" },
  { icon: "🦁", key: "lion" },
  { icon: "🐯", key: "tiger" },
  { icon: "🐮", key: "cow" },
  { icon: "🐷", key: "pig" },
  { icon: "🐴", key: "horse" },
  { icon: "🐲", key: "dragon" },
  { icon: "🦅", key: "eagle" },
] as const;

// Helper: get default team for index (falls back to numbered teams beyond the list).
// The name is stored in the DB, so it is rendered once in the creator's language.
export function getDefaultTeam(index: number, t: TFunction) {
  if (index < DEFAULT_TEAM_ICONS.length) {
    const team = DEFAULT_TEAM_ICONS[index];
    return { icon: team.icon, name: t(`common.defaultTeams.${team.key}` as MessageKey) };
  }
  return { icon: `${index + 1}`, name: t("common.defaultTeams.numbered", { n: index + 1 }) };
}

// 比赛类型代码；显示名见 i18n 的 common.matchType
export const MATCH_TYPES = ["MD", "WD", "XD"] as const;

type MatchType = (typeof MATCH_TYPES)[number];

export const DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT = 2;
export const DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT = 3;

// 计分方式；显示名见 i18n 的 common.scoringMode
export const SCORING_MODES = {
  single_21: { games: 1, points: 21 },
  single_30: { games: 1, points: 30 },
  best_of_3_15: { games: 3, points: 15 },
  best_of_3_21: { games: 3, points: 21 },
} as const;

export type ScoringMode = keyof typeof SCORING_MODES;

interface TemplatePositionConfig {
  positionNumber: number;
  gender: "M" | "F";
}

interface MirroredTemplateMatchConfig {
  matchType: MatchType;
  homePos1: number;
  homePos2: number;
  awayPos1: number;
  awayPos2: number;
  sortOrder: number;
}

export function buildTemplatePositions(
  malesPerGroup: number,
  femalesPerGroup: number
) {
  const total = malesPerGroup + femalesPerGroup;
  const positions: TemplatePositionConfig[] = [];

  for (let i = 1; i <= total; i++) {
    positions.push({
      positionNumber: i,
      gender: i <= malesPerGroup ? "M" : "F",
    });
  }

  return positions;
}

function createMirroredTemplateMatch(
  matchType: MatchType,
  pos1: number,
  pos2: number,
  sortOrder: number
): MirroredTemplateMatchConfig {
  return {
    matchType,
    homePos1: pos1,
    homePos2: pos2,
    awayPos1: pos1,
    awayPos2: pos2,
    sortOrder,
  };
}

export function buildDefaultTemplate(
  malesPerGroup: number,
  femalesPerGroup: number
) {
  const positions = buildTemplatePositions(malesPerGroup, femalesPerGroup);
  const malePositions = positions
    .filter((position) => position.gender === "M")
    .map((position) => position.positionNumber);
  const femalePositions = positions
    .filter((position) => position.gender === "F")
    .map((position) => position.positionNumber);

  const matches: MirroredTemplateMatchConfig[] = [];
  const seen = new Set<string>();

  const pushMatch = (matchType: MatchType, pos1?: number, pos2?: number) => {
    if (!pos1 || !pos2) return;

    const key = `${matchType}:${pos1}-${pos2}`;
    if (seen.has(key)) return;

    matches.push(createMirroredTemplateMatch(matchType, pos1, pos2, matches.length + 1));
    seen.add(key);
  };

  pushMatch("MD", malePositions[0], malePositions[1]);
  pushMatch("MD", malePositions[1], malePositions[2]);
  pushMatch("WD", femalePositions[0], femalePositions[1]);
  pushMatch("XD", malePositions[0], femalePositions[0]);
  pushMatch("XD", malePositions[malePositions.length - 1], femalePositions[femalePositions.length - 1]);

  return {
    positions,
    matches,
  };
}
