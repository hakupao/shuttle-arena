import type { Messages } from "../zh";

const adminTemplate: Messages["adminTemplate"] = {
  loadFailed: "Failed to load template.",
  saved: "Template saved",
  saveFailed: "Failed to save.",
  networkError: "Network error.",
  resetDone: "Reset to the default template",
  loading: "Loading...",
  back: "Back",
  title: "Match template",
  selectTournamentFirst: "Go back to Admin and select a tournament first",
  selectTournamentToConfigure: "Select a tournament before configuring the template",
  subtitle: "Define the matches and lineups for each team match",
  resetDefault: "Reset to default",
  saving: "Saving...",
  saveTemplate: "Save template",
  positionSetup: "Positions",
  malePlayers: "Male players × {n}",
  femalePlayers: "Female players × {n}",
  perTeamTotal: "{n} players per team",
  totalMatches: "Total matches",
  encounters: "Matchups",
  addMatch: "Add match",
  lineup: "Lineup",
  mirrorHint: "Home and away mirror automatically: Team A {p1} + {p2} vs Team B {p1} + {p2}",
  noMatches: "No matches yet. Click \"Add match\" to start configuring",
  noteLabel: "Note: ",
  noteBody: "Each time two teams meet, {count} matches are played according to this template. Position numbers refer to player numbers within a team (e.g. {example} = male player 1). Using the same position numbers for home and away means a \"mirror\" matchup, where both sides field the same positions.",
  exampleLabel: "No. {n}",
};

export default adminTemplate;
