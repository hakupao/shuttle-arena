import type { Messages } from "../zh";

const adminTemplate: Messages["adminTemplate"] = {
  loadFailed: "テンプレートの読み込みに失敗しました",
  saved: "テンプレートを保存しました",
  saveFailed: "保存に失敗しました",
  networkError: "ネットワークエラー",
  resetDone: "デフォルトのテンプレートに戻しました",
  loading: "読み込み中...",
  back: "戻る",
  title: "試合テンプレート",
  selectTournamentFirst: "先に管理画面で大会を選択してください",
  selectTournamentToConfigure: "大会を選択してからテンプレートを設定してください",
  subtitle: "チーム対抗ごとの試合数と出場メンバーの組み合わせを定義します",
  resetDefault: "デフォルトに戻す",
  saving: "保存中...",
  saveTemplate: "テンプレートを保存",
  positionSetup: "ポジション編成",
  malePlayers: "男子選手 × {n}",
  femalePlayers: "女子選手 × {n}",
  perTeamTotal: "1チーム計 {n} 人",
  totalMatches: "総試合数",
  encounters: "対戦カード",
  addMatch: "試合を追加",
  lineup: "出場ペア",
  mirrorHint: "ホーム/アウェイは自動でミラー設定: Aチーム {p1} + {p2} vs Bチーム {p1} + {p2}",
  noMatches: "試合がありません。「試合を追加」をクリックして設定を始めましょう",
  noteLabel: "説明：",
  noteBody: "2チームが対戦するたびに、このテンプレートに従って {count} 試合を行います。ポジション番号はチーム内の選手番号に対応します（例: {example} = 男子1番の選手）。ホームとアウェイで同じポジション番号を使うと「ミラー対戦」となり、双方が同じポジションの選手を出場させます。",
  exampleLabel: "{n}番",
};

export default adminTemplate;
