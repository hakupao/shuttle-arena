import type { Messages } from "../zh";

const components: Messages["components"] = {
  adminHeader: {
    status: {
      draft: "準備中",
      active: "進行中",
      finished: "終了",
      archived: "アーカイブ済み",
    },
  },
  scoreTimeline: {
    title: "得点推移",
    live: "リアルタイム更新",
    gameN: "第{n}ゲーム",
  },
  qualityReport: {
    title: "編成品質レポート",
    hasIssues: "要確認",
    good: "良好",
    colCode: "コード",
    colGender: "性別",
    colTotal: "出場数",
    colMaxPlayingShort: "連続出場",
    colMaxPlaying: "最大連続出場",
    colMaxRestingShort: "連続休み",
    colMaxResting: "最大連続休み",
    colLongestRest: "最長休憩",
    male: "男",
    female: "女",
    minutes: "{n}分",
  },
  scheduleMatrix: {
    title: "日程マトリクス",
    round: "ラウンド",
    court: "コート {n}",
    roundN: "第{n}ラウンド",
  },
};

export default components;
