const components = {
  adminHeader: {
    status: {
      draft: "筹备中",
      active: "进行中",
      finished: "已结束",
      archived: "已归档",
    },
  },
  scoreTimeline: {
    title: "得分路径",
    live: "实时更新",
    gameN: "第 {n} 局",
  },
  qualityReport: {
    title: "排布质量报告",
    hasIssues: "有异常",
    good: "质量良好",
    colCode: "代号",
    colGender: "性别",
    colTotal: "总上场",
    colMaxPlayingShort: "连上",
    colMaxPlaying: "最大连续上场",
    colMaxRestingShort: "连空",
    colMaxResting: "最大连续轮空",
    colLongestRest: "最长休息",
    male: "男",
    female: "女",
    minutes: "{n}分钟",
  },
  scheduleMatrix: {
    title: "赛程矩阵",
    round: "轮次",
    court: "场地 {n}",
    roundN: "第{n}轮",
  },
};

export default components;
