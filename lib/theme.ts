/**
 * Light/dark appearance. Persisted in a cookie so the server can render the
 * right theme on the very first paint (no flash), and toggled on the client
 * without a round-trip. Kept free of server-only imports so the cookie name and
 * helpers can be shared with Client Components.
 */
export const THEME_COOKIE = "nexora_theme";

export type Theme = "light" | "dark";

export function resolveTheme(value: string | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}
