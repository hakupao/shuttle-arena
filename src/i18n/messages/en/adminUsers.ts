import type { Messages } from "../zh";

const adminUsers: Messages["adminUsers"] = {
  title: "Accounts",
  loading: "Loading...",
  loadListFailed: "Failed to load users",
  fillRequired: "Enter a username and password",
  createSuccess: "User \"{name}\" created",
  createFailed: "Failed to create",
  networkError: "Network error",
  deleteConfirm: "Delete user \"{name}\"?",
  deleted: "Deleted",
  deleteFailed: "Failed to delete",
  enterNewPassword: "Enter a new password",
  passwordReset: "Password reset",
  resetFailed: "Failed to reset",
  counts: "{athletes} athletes · {admins} admins",
  username: "Username",
  password: "Password",
  roleAthlete: "Athlete",
  roleAdmin: "Admin",
  create: "Create",
  athletesHeading: "Athletes ({n})",
  adminsHeading: "Admins ({n})",
  bound: "Linked",
  newPassword: "New password",
  confirm: "Confirm",
  cancel: "Cancel",
};

export default adminUsers;
