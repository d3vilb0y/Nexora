import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";
import { appUrl, getOidcConfig, isOidcConfigured, oidc } from "@/lib/oidc";

/**
 * Signs the user out: destroys the local session, then — when the IdP
 * supports RP-initiated logout — ends the IdP session too.
 */
export async function POST(request: NextRequest) {
  const base = appUrl(request.nextUrl.origin);
  const idToken = await destroySession();

  if (isOidcConfigured() && idToken) {
    try {
      const config = await getOidcConfig();
      if (config.serverMetadata().end_session_endpoint) {
        const endUrl = oidc.buildEndSessionUrl(config, {
          id_token_hint: idToken,
          post_logout_redirect_uri: `${base}/login`,
        });
        return NextResponse.redirect(endUrl, 303);
      }
    } catch (err) {
      // IdP unreachable — local logout already happened, so just continue.
      console.error("RP-initiated logout skipped:", err);
    }
  }
  return NextResponse.redirect(`${base}/login`, 303);
}
