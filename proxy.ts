import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "nexora_session";

/** Paths reachable without a session. API routes enforce auth themselves (401/403). */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/denied" ||
    pathname.startsWith("/api/")
  );
}

/**
 * Two jobs:
 *
 * 1. Optimistic auth gate — pages require the session cookie to be present,
 *    otherwise redirect to /login (preserving the destination). This is only
 *    the cheap pre-filter the auth guide recommends: no DB access here. The
 *    secure check (session validity + RBAC) happens in the data access layer
 *    (lib/auth.ts) on every page, Server Action and API route.
 *
 * 2. Server Actions behind a reverse proxy — the browser sends an `Origin` of
 *    the public URL while the container sees an internal host, so Next.js 16's
 *    Server Action CSRF guard would abort every action. Align
 *    `x-forwarded-host` with `Origin` for action POSTs. The session cookie is
 *    `SameSite=Lax`, so cross-site POSTs never carry it — CSRF on actions
 *    remains covered by the cookie itself.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    !isPublicPath(pathname) &&
    process.env.NEXORA_AUTH_DISABLED !== "1" &&
    !request.cookies.get(SESSION_COOKIE)?.value
  ) {
    const login = new URL("/login", request.nextUrl);
    if (pathname !== "/") {
      login.searchParams.set("next", pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(login);
  }

  const origin = request.headers.get("origin");
  if (request.method === "POST" && origin) {
    try {
      const headers = new Headers(request.headers);
      headers.set("x-forwarded-host", new URL(origin).host);
      return NextResponse.next({ request: { headers } });
    } catch {
      // Malformed Origin — let Next.js handle the request unchanged.
    }
  }
  return NextResponse.next();
}

export const config = {
  // Run on app routes (where pages render and Server Actions POST), skip static assets.
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
