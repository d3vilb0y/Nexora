/** Short-lived cookie carrying the in-flight OIDC transaction (PKCE verifier, state, nonce). */
export const OIDC_TX_COOKIE = "nexora_oidc";

/** Only follow internal absolute paths, so callbacks can't redirect off-site. */
export function safeInternalPath(path: string | null | undefined): string {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}
