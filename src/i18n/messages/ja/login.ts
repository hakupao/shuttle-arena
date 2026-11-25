import type { Messages } from "../zh";

const login: Messages["login"] = {
  tabLogin: "ログイン",
  tabRegister: "選手登録",
  username: "ユーザー名",
  password: "パスワード",
  confirmPassword: "パスワード（確認）",
  usernamePlaceholder: "ユーザー名を入力",
  passwordPlaceholder: "パスワードを入力",
  regUsernamePlaceholder: "本名またはニックネームがおすすめです",
  regPasswordPlaceholder: "{min}文字以上",
  regConfirmPlaceholder: "もう一度パスワードを入力",
  loginFailed: "ログインに失敗しました",
  loggingIn: "ログイン中...",
  submitLogin: "ログイン",
  registerIntro: "選手登録後、管理者が出場ポジションに紐付けると、自分の試合日程や試合記録を確認できるようになります。",
  passwordMismatch: "パスワードが一致しません",
  passwordTooShort: "パスワードは{min}文字以上にしてください",
  usernameTooShort: "ユーザー名は{min}文字以上にしてください",
  registerFailed: "登録に失敗しました",
  networkError: "ネットワークエラー",
  registerSuccess: "登録が完了しました！",
  redirecting: "移動中...",
  registering: "登録中...",
  submitRegister: "選手アカウントを登録",
};

export default login;
