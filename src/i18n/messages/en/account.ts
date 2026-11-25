import type { Messages } from "../zh";

const account: Messages["account"] = {
  loginFirst: "Please log in first",
  enterCurrentPassword: "Enter your current password",
  nothingToSave: "No changes to save",
  usernameTooShort: "Username must be at least {min} characters",
  newPasswordTooShort: "New password must be at least {min} characters",
  passwordMismatch: "The new passwords do not match",
  saveFailed: "Failed to save",
  updated: "Account updated",
  loading: "Loading...",
  goLogin: "Go to log in",
  title: "My account",
  roleAdmin: "Admin",
  roleAthlete: "Player",
  editTitle: "Edit account",
  editDescription: "Enter your current password to make changes. Leave the new password blank to change only the username.",
  username: "Username",
  usernamePlaceholder: "Enter your username",
  currentPassword: "Current password",
  currentPasswordPlaceholder: "Enter your current password",
  newPassword: "New password",
  newPasswordPlaceholder: "Leave blank to keep it",
  confirmNewPassword: "Confirm new password",
  confirmNewPasswordPlaceholder: "Enter the new password again",
  saving: "Saving...",
  save: "Save changes",
  reset: "Reset form",
};

export default account;
