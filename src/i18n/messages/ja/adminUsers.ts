import type { Messages } from "../zh";

const adminUsers: Messages["adminUsers"] = {
  title: "アカウント管理",
  loading: "読み込み中...",
  loadListFailed: "ユーザー一覧の読み込みに失敗しました",
  fillRequired: "ユーザー名とパスワードを入力してください",
  createSuccess: "ユーザー「{name}」を作成しました",
  createFailed: "作成に失敗しました",
  networkError: "ネットワークエラー",
  deleteConfirm: "ユーザー「{name}」を削除しますか？",
  deleted: "削除しました",
  deleteFailed: "削除に失敗しました",
  enterNewPassword: "新しいパスワードを入力してください",
  passwordReset: "パスワードをリセットしました",
  resetFailed: "リセットに失敗しました",
  counts: "選手 {athletes} 名 · 管理者 {admins} 名",
  username: "ユーザー名",
  password: "パスワード",
  roleAthlete: "選手",
  roleAdmin: "管理者",
  create: "作成",
  athletesHeading: "選手 ({n})",
  adminsHeading: "管理者 ({n})",
  bound: "紐付け済み",
  newPassword: "新パスワード",
  confirm: "確定",
  cancel: "キャンセル",
};

export default adminUsers;
