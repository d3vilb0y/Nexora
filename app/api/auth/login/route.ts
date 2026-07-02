import { NextResponse, type NextRequest } from "next/server";
import { appUrl, getOidcConfig, isOidcConfigured, oidc, oidcScopes } from "@/lib/oidc";
import { OIDC_TX_COOKIE, safeInternalPath } from "../shared";

/** Kicks off the OIDC Authorization Code + PKCE flow. */
export async function GET(request: NextRequest) {
  const base = appUrl(request.nextUrl.origin);
  if (!isOidcConfigured()) {
    return NextResponse.redirect(`${base}/login?error=not-configured`);
  }

  let config;
  try {
    config = await getOidcConfig();
  } catch (err) {
    console.error("OIDC discovery failed:", err);
    return NextResponse.redirect(`${base}/login?error=discovery`);
  }

  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const authUrl = oidc.buildAuthorizationUrl(config, {
    redirect_uri: `${base}/api/auth/callback`,
    scope: oidcScopes(),
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
    state,
    nonce,
  });

  const next = safeInternalPath(request.nextUrl.searchParams.get("next"));
  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OIDC_TX_COOKIE, JSON.stringify({ verifier, state, nonce, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: base.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return res;
}
