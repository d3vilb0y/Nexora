import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server Actions behind a reverse proxy.
 *
 * This app runs behind a reverse proxy (preview/sandbox environments, etc.).
 * The browser sends an `Origin` header of the public URL, but the container
 * sees a different internal host — so Next.js 16's Server Action CSRF guard
 * (which requires `Origin` to match the forwarded host) aborts every action
 * with a 500. The visible symptom is that mutations silently fail: e.g. the
 * header vendor picker appears to "reset" to the first vendor because the
 * cookie write never lands.
 *
 * The alternative — `experimental.serverActions.allowedOrigins` — needs the
 * public hostname baked into config, which isn't known ahead of time here.
 * Instead we align `x-forwarded-host` with the request's own `Origin` for
 * action POSTs, so the same-origin check passes for whatever host the app is
 * served from. This is safe for this single-tenant, pre-auth tool; revisit
 * (and prefer an explicit allowedOrigins allowlist) once auth is in place.
 */
export function proxy(request: NextRequest) {
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
  // Run on app routes (where Server Actions POST), skip static assets.
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
