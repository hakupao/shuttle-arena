import type { Messages } from "../zh";

const schedule: Messages["schedule"] = {
  loading: "読み込み中...",
  title: "日程",
  noTournament: "表示できる大会がありません",
  notGenerated: "日程はまだ作成されていません",
  statusPending: "開始前",
  statusInProgress: "進行中",
  statusFinished: "終了",
  viewMatrix: "マトリクス",
  viewList: "リスト",
  searchPlaceholder: "選手名で検索...",
  searchFound: "{n} 件の試合が見つかりました",
  mineHint: "黄色のハイライト = あなたの試合",
  searchEmpty: "「{query}」に関する試合は見つかりませんでした",
  courtShort: "コート{n}",
  courtSpaced: "コート {n}",
  matchCourt: "{type} · コート{n}",
  roundShort: "R{n}",
  roundTitle: "ラウンド {n}",
  roundColumn: "ラウンド",
};

export default schedule;
