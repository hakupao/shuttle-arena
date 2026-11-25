import type { Messages } from "../zh";

const common: Messages["common"] = {
  meta: {
    title: "ShuttleArena | Badminton Team Tournaments",
  },
  brand: {
    tagline: "Badminton team round-robin manager",
  },
  language: {
    label: "Language",
  },
  nav: {
    home: "Home",
    teams: "Teams",
    schedule: "Schedule",
    standings: "Standings",
    admin: "Admin",
    myMatches: "My Matches",
    account: "Account",
    currentTournament: "Tournament:",
    selectTournament: "Select tournament",
    login: "Log in",
    logout: "Log out",
    logoutFull: "Log out",
  },
  footer: {
    tagline: "Every match deserves to be remembered",
    homepage: "Personal site",
    sendEmail: "Send email",
  },
  matchType: {
    MD: "MD",
    WD: "WD",
    XD: "XD",
  },
  scoringMode: {
    single_21: "1 game to 21",
    single_30: "1 game to 30",
    best_of_3_15: "Best of 3 to 15",
    best_of_3_21: "Best of 3 to 21",
  },
  defaultTeams: {
    cat: "Cats",
    dog: "Dogs",
    rabbit: "Rabbits",
    panda: "Pandas",
    hamster: "Hamsters",
    raccoon: "Raccoons",
    koala: "Koalas",
    hedgehog: "Hedgehogs",
    otter: "Otters",
    penguin: "Penguins",
    fox: "Foxes",
    bear: "Bears",
    frog: "Frogs",
    lion: "Lions",
    tiger: "Tigers",
    cow: "Cows",
    pig: "Pigs",
    horse: "Horses",
    dragon: "Dragons",
    eagle: "Eagles",
    numbered: "Team {n}",
  },
  position: {
    suffix: "",
    slotSuffix: "",
  },
  auth: {
    loginFailed: "Login failed.",
  },
};

export default common;
