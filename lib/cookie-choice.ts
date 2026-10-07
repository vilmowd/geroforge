export const COOKIE_CHOICE_KEY = "forge_cookie_notice";
const COOKIE_CHOICE_VERSION = "2";

export type CookieChoice = "all" | "necessary";

export function readCookieChoice(): CookieChoice | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(COOKIE_CHOICE_KEY);
  if (value === `all:${COOKIE_CHOICE_VERSION}`) return "all";
  if (value === `necessary:${COOKIE_CHOICE_VERSION}`) return "necessary";
  return null;
}

export function writeCookieChoice(choice: CookieChoice) {
  window.localStorage.setItem(COOKIE_CHOICE_KEY, `${choice}:${COOKIE_CHOICE_VERSION}`);
  document.documentElement.dataset.cookie = "closed";
  document.documentElement.dataset.cookies = choice;
  window.dispatchEvent(new Event("forge-cookies"));
}
