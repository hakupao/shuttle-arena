import type { Messages } from "../zh";

const adminSwap: Messages["adminSwap"] = {
  title: "Substitutions",
  loading: "Loading...",
  loadFailed: "Failed to load data.",
  swapSuccess: "Player substituted",
  swapFailed: "Substitution failed.",
  networkError: "Network error.",
  noSchedule: "No official schedule yet. Publish the official schedule first",
  selectTournament: "Select a tournament first",
  noDualPositions: "No positions have a sub yet. Add subs to positions on the Player setup page first.",
  positionFallback: "#{n}",
  appearances: "({n} played)",
  swapTo: "Swap to {name} ({n} played)",
  alternateFallback: "Sub",
  primaryFallback: "Main",
  summary: "{swappable} swappable slots · {matches} related matches",
  refresh: "Refresh",
  statsTitle: "Appearances at positions with subs",
  positionStat: "{icon}#{n}:",
  round: "Round {n}",
  matchCount: "{n} matches",
  court: "Court {n}",
  finished: "Finished",
  inProgress: "In progress",
};

export default adminSwap;
