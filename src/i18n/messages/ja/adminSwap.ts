import type { Messages } from "../zh";

const adminSwap: Messages["adminSwap"] = {
  title: "選手交代",
  loading: "読み込み中...",
  loadFailed: "データの読み込みに失敗しました",
  swapSuccess: "選手を交代しました",
  swapFailed: "選手交代に失敗しました",
  networkError: "ネットワークエラー",
  noSchedule: "日程データがありません。先に日程を作成してください",
  selectTournament: "先に大会を選択してください",
  noDualPositions: "ダブル枠のポジションがありません。「選手」ページでポジションに交代要員を追加してください",
  positionFallback: "{n}番",
  appearances: "({n}試合)",
  swapTo: "{name} に交代 ({n}試合)",
  alternateFallback: "交代要員",
  primaryFallback: "主力",
  summary: "交代可能 {swappable} 枠 · 関連試合 {matches} 試合",
  refresh: "更新",
  statsTitle: "ダブル枠の出場数",
  positionStat: "{icon}{n}番:",
  round: "第 {n} ラウンド",
  matchCount: "{n} 試合",
  court: "コート{n}",
  finished: "終了",
  inProgress: "進行中",
};

export default adminSwap;
