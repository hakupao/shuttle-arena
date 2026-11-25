import type { Messages } from "../zh";

const myMatches: Messages["myMatches"] = {
  loading: "読み込み中...",
  roundCourt: "第{round}ラウンド · コート{court}",
  win: "勝",
  loss: "敗",
  inProgress: "進行中",
  pending: "開始前",
  partner: "ペア",
  opponent: "対戦相手",
  title: "マイ試合",
  loginRequired: "ログインして個人の日程を確認してください",
  goLogin: "ログインへ",
  noTournament: "表示できる大会がありません",
  notBound: "アカウントが選手に紐付けられていません",
  contactAdmin: "管理者に出場ポジションの紐付けを依頼してください",
  viewFullSchedule: "全日程を見る",
  matchCount: "試合数",
  tabUpcoming: "開始前 ({n})",
  tabActive: "進行中 ({n})",
  tabFinished: "終了 ({n})",
  emptyUpcoming: "開始前の試合はありません",
  emptyActive: "進行中の試合はありません",
  emptyFinished: "終了した試合はまだありません",
};

export default myMatches;
