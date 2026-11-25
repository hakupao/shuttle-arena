import type { Messages } from "../zh";

const components: Messages["components"] = {
  adminHeader: {
    status: {
      draft: "Preparing",
      active: "In progress",
      finished: "Finished",
      archived: "Archived",
    },
  },
  scoreTimeline: {
    title: "Scoring timeline",
    live: "Live",
    gameN: "Game {n}",
  },
  qualityReport: {
    title: "Schedule quality report",
    hasIssues: "Issues found",
    good: "Good",
    colCode: "Code",
    colGender: "Gender",
    colTotal: "Matches",
    colMaxPlayingShort: "Streak",
    colMaxPlaying: "Max consecutive matches",
    colMaxRestingShort: "Byes",
    colMaxResting: "Max consecutive byes",
    colLongestRest: "Longest rest",
    male: "M",
    female: "F",
    minutes: "{n} min",
  },
  scheduleMatrix: {
    title: "Schedule matrix",
    round: "Round",
    court: "Court {n}",
    roundN: "Round {n}",
  },
};

export default components;
