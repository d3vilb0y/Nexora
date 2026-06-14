"use client";

import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

const YEAR = 60 * 60 * 24 * 365;

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

/**
 * One-click switch between light and dark for the whole CRM. The choice is
 * applied instantly on the client (toggling the `dark` class the palette hangs
 * off) and stored in a cookie so the next server render — on any page — paints
 * the same theme with no flash. No Server Action round-trip, so it sidesteps the
 * stale-cookie re-render.
 */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const dark = theme === "dark";

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    const root = document.documentElement;
    // Crossfade colours only on an intentional toggle, never on first paint.
    root.classList.add("theme-transition");
    setTheme(next);
    root.classList.toggle("dark", next === "dark");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${YEAR}; samesite=lax`;
    window.setTimeout(() => root.classList.remove("theme-transition"), 220);
  }

  const label = dark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
