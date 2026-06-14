"use client";

import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

const YEAR = 60 * 60 * 24 * 365;

/**
 * Flips the whole CRM between light and dark. The choice is applied instantly on
 * the client (toggling the `dark` class the palette hangs off) and stored in a
 * cookie so the next server render — on any page — paints the same theme with no
 * flash. No Server Action round-trip, so it sidesteps the stale-cookie re-render.
 */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${YEAR}; samesite=lax`;
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 focus:border-sky-500 focus:outline-none"
    >
      <span aria-hidden="true">{dark ? "☀️" : "🌙"}</span>
      <span className="sr-only sm:not-sr-only sm:ml-1.5">
        {dark ? "Light" : "Dark"}
      </span>
    </button>
  );
}
