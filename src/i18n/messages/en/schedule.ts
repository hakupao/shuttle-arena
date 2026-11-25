import type { Messages } from "../zh";

const schedule: Messages["schedule"] = {
  loading: "Loading...",
  title: "Schedule",
  noTournament: "No tournament to view",
  notGenerated: "The schedule has not been generated yet",
  statusPending: "Upcoming",
  statusInProgress: "In progress",
  statusFinished: "Finished",
  viewMatrix: "Grid",
  viewList: "List",
  searchPlaceholder: "Search player name...",
  searchFound: "{n} matches found",
  mineHint: "Yellow highlight = your matches",
  searchEmpty: "No matches found for \"{query}\"",
  courtShort: "Court {n}",
  courtSpaced: "Court {n}",
  matchCourt: "{type} · Court {n}",
  roundShort: "R{n}",
  roundTitle: "Round {n}",
  roundColumn: "Round",
};

export default schedule;
