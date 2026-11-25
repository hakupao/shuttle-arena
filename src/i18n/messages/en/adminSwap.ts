import type { Messages } from "../zh";

const adminSwap: Messages["adminSwap"] = {
  title: "Substitutions",
  loading: "Loading...",
  loadFailed: "Failed to load data",
  swapSuccess: "Player substituted",
  swapFailed: "Substitution failed",
  networkError: "Network error",
  noSchedule: "No schedule yet. Generate the schedule first",
  selectTournament: "Select a tournament first",
  noDualPositions: "No dual-player positions. Add rotation players to positions on the Players page first",
  positionFallback: "#{n}",
  appearances: "({n} played)",
  swapTo: "Swap to {name} ({n} played)",
  alternateFallback: "Alternate",
  primaryFallback: "Primary",
  summary: "{swappable} swappable slots · {matches} related matches",
  refresh: "Refresh",
  statsTitle: "Dual-position appearances",
  positionStat: "{icon}#{n}:",
  round: "Round {n}",
  matchCount: "{n} matches",
  court: "Court {n}",
  finished: "Finished",
  inProgress: "In progress",
};

export default adminSwap;
