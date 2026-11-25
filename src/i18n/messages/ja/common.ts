import type { Messages } from "../zh";

const common: Messages["common"] = {
  meta: {
    title: "ShuttleArena | バドミントン団体戦",
  },
  brand: {
    tagline: "バドミントン団体リーグ戦 管理システム",
  },
  language: {
    label: "言語",
  },
  nav: {
    home: "ホーム",
    teams: "チーム",
    schedule: "日程",
    standings: "順位",
    admin: "管理画面",
    myMatches: "マイ試合",
    account: "アカウント",
    currentTournament: "現在の大会:",
    selectTournament: "大会を選択",
    login: "ログイン",
    logout: "ログアウト",
    logoutFull: "ログアウト",
  },
  footer: {
    tagline: "すべての試合を、記憶に残るものに",
    homepage: "作者のサイト",
    sendEmail: "メールを送る",
  },
  matchType: {
    MD: "男複",
    WD: "女複",
    XD: "混複",
  },
  scoringMode: {
    single_21: "1ゲーム 21点",
    single_30: "1ゲーム 30点",
    best_of_3_15: "3ゲーム制 15点",
    best_of_3_21: "3ゲーム制 21点",
  },
  defaultTeams: {
    cat: "ネコ",
    dog: "イヌ",
    rabbit: "ウサギ",
    panda: "パンダ",
    hamster: "ハムスター",
    raccoon: "アライグマ",
    koala: "コアラ",
    hedgehog: "ハリネズミ",
    otter: "カワウソ",
    penguin: "ペンギン",
    fox: "キツネ",
    bear: "クマ",
    frog: "カエル",
    lion: "ライオン",
    tiger: "トラ",
    cow: "ウシ",
    pig: "ブタ",
    horse: "ウマ",
    dragon: "ドラゴン",
    eagle: "ワシ",
    numbered: "チーム{n}",
  },
  position: {
    suffix: "番",
    slotSuffix: "番",
  },
  auth: {
    loginFailed: "ログインに失敗しました",
  },
};

export default common;
