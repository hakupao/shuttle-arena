import type { Messages } from "../zh";

const login: Messages["login"] = {
  tabLogin: "Log in",
  tabRegister: "Player sign-up",
  username: "Username",
  password: "Password",
  confirmPassword: "Confirm password",
  usernamePlaceholder: "Enter your username",
  passwordPlaceholder: "Enter your password",
  regUsernamePlaceholder: "Your real name or a nickname",
  regPasswordPlaceholder: "At least {min} characters",
  regConfirmPlaceholder: "Enter the password again",
  loginFailed: "Login failed.",
  loggingIn: "Logging in...",
  submitLogin: "Log in",
  registerIntro: "Once you sign up and an admin links you to a tournament position, you can see your own schedule and match history.",
  passwordMismatch: "Passwords do not match.",
  passwordTooShort: "Password must be at least {min} characters.",
  usernameTooShort: "Username must be at least {min} characters.",
  registerFailed: "Sign-up failed.",
  networkError: "Network error. Please try again.",
  registerSuccess: "Signed up!",
  redirecting: "Redirecting...",
  registering: "Signing up...",
  submitRegister: "Create player account",
};

export default login;
