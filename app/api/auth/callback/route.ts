import { NextResponse, type NextRequest } from "next/server";
import { createSession, upsertOidcUser } from "@/lib/auth";
import { appUrl, getOidcConfig, oidc } from "@/lib/oidc";
import { OIDC_TX_COOKIE, safeInternalPath } from "../shared";

/** Completes the OIDC flow: validates the callback, mints a session. */
export async function GET(request: NextRequest) {
  const base = appUrl(request.nextUrl.origin);
  const fail = (error: string) => {
    const res = NextResponse.redirect(`${base}/login?error=${error}`);
    res.cookies.delete(OIDC_TX_COOKIE);
    return res;
  };

  const txRaw = request.cookies.get(OIDC_TX_COOKIE)?.value;
  if (!txRaw) return fail("expired");
  let tx: { verifier: string; state: string; nonce: string; next: string };
  try {
    tx = JSON.parse(txRaw);
  } catch {
    return fail("expired");
  }

  // Behind a reverse proxy the container sees an internal host; rebuild the
  // callback URL on the public base so it matches the registered redirect_uri.
  const publicUrl = new URL(`${base}/api/auth/callback`);
  publicUrl.search = request.nextUrl.search;

  let claims;
  let idToken = "";
  try {
    const config = await getOidcConfig();
    const tokens = await oidc.authorizationCodeGrant(config, publicUrl, {
      pkceCodeVerifier: tx.verifier,
      expectedState: tx.state,
      expectedNonce: tx.nonce,
      idTokenExpected: true,
    });
    claims = tokens.claims();
    idToken = tokens.id_token ?? "";
  } catch (err) {
    console.error("OIDC callback failed:", err);
    return fail("failed");
  }

  const email = typeof claims?.email === "string" ? claims.email : "";
  if (!claims?.sub || !email) {
    // Without a stable subject + email we can't map the login to a user.
    return fail("no-email");
  }
  const name =
    (typeof claims.name === "string" && claims.name) ||
    (typeof claims.preferred_username === "string" &&
      claims.preferred_username) ||
    email;

  const user = upsertOidcUser({ sub: claims.sub, email, name });
  await createSession(user.id, idToken);

  const res = NextResponse.redirect(`${base}${safeInternalPath(tx.next)}`);
  res.cookies.delete(OIDC_TX_COOKIE);
  return res;
}
