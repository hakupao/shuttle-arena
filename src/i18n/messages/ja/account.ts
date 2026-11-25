import type { Messages } from "../zh";

const account: Messages["account"] = {
  loginFirst: "先にログインしてください",
  enterCurrentPassword: "現在のパスワードを入力してください",
  nothingToSave: "保存する変更がありません",
  usernameTooShort: "ユーザー名は{min}文字以上にしてください",
  newPasswordTooShort: "新しいパスワードは{min}文字以上にしてください",
  passwordMismatch: "新しいパスワードが一致しません",
  saveFailed: "保存に失敗しました",
  updated: "アカウント情報を更新しました",
  loading: "読み込み中...",
  goLogin: "ログインへ",
  title: "マイアカウント",
  roleAdmin: "管理者",
  roleAthlete: "選手",
  editTitle: "アカウント情報の変更",
  editDescription: "変更には現在のパスワードが必要です。新しいパスワードを空欄にすると、ユーザー名のみ変更されます。",
  username: "ユーザー名",
  usernamePlaceholder: "ユーザー名を入力",
  currentPassword: "現在のパスワード",
  currentPasswordPlaceholder: "現在のパスワードを入力",
  newPassword: "新しいパスワード",
  newPasswordPlaceholder: "変更しない場合は空欄",
  confirmNewPassword: "新しいパスワード（確認）",
  confirmNewPasswordPlaceholder: "新しいパスワードを再入力",
  saving: "保存中...",
  save: "変更を保存",
  reset: "フォームをリセット",
};

export default account;
