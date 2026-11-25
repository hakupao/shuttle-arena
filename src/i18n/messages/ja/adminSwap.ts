import type { Messages } from "../zh";

const adminSwap: Messages["adminSwap"] = {
  title: "選手交代",
  loading: "読み込み中...",
  loadFailed: "データの読み込みに失敗しました",
  swapSuccess: "選手を交代しました",
  swapFailed: "選手交代に失敗しました",
  networkError: "ネットワークエラー",
  noSchedule: "正式日程がありません。先に正式日程を公開してください",
  selectTournament: "先に大会を選択してください",
  noDualPositions: "交代選手のいるポジションがありません。先に「選手設定」ページでポジションに交代選手を追加してください",
  positionFallback: "{n}番",
  appearances: "({n}試合)",
  swapTo: "{name} に交代 ({n}試合)",
  alternateFallback: "交代選手",
  primaryFallback: "主力選手",
  summary: "交代可能 {swappable} 枠 · 関連試合 {matches} 試合",
  refresh: "更新",
  statsTitle: "交代選手ありポジションの出場数",
  positionStat: "{icon}{n}番:",
  round: "第{n}ラウンド",
  matchCount: "{n} 試合",
  court: "コート{n}",
  finished: "終了",
  inProgress: "進行中",
};

export default adminSwap;
