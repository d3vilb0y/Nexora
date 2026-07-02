import * as oidc from "openid-client";

/**
 * OIDC provider wiring (any spec-compliant IdP: Entra ID, Okta, Keycloak,
 * Auth0, Google, …). Configured entirely through env:
 *
 *   OIDC_ISSUER        e.g. https://login.example.com/realms/acme
 *   OIDC_CLIENT_ID
 *   OIDC_CLIENT_SECRET optional — omit for public clients (PKCE is always used)
 *   OIDC_SCOPES        optional, default "openid profile email"
 *   NEXORA_APP_URL     public base URL, used for the redirect/logout URIs
 */

export function isOidcConfigured(): boolean {
  return Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID);
}

export function appUrl(fallbackOrigin: string): string {
  return (process.env.NEXORA_APP_URL || fallbackOrigin).replace(/\/$/, "");
}

export function oidcScopes(): string {
  return process.env.OIDC_SCOPES || "openid profile email";
}

let cached: Promise<oidc.Configuration> | null = null;

/** Discover (and cache) the IdP configuration. */
export function getOidcConfig(): Promise<oidc.Configuration> {
  if (!cached) {
    const issuer = new URL(process.env.OIDC_ISSUER!);
    const secret = process.env.OIDC_CLIENT_SECRET;
    cached = oidc
      .discovery(
        issuer,
        process.env.OIDC_CLIENT_ID!,
        undefined,
        secret ? oidc.ClientSecretBasic(secret) : oidc.None(),
        {
          // Plain-http issuers are only for local/dev IdPs (e.g. the mock
          // server used in tests); real deployments use https and skip this.
          execute:
            issuer.protocol === "http:" ? [oidc.allowInsecureRequests] : [],
        }
      )
      .catch((err) => {
        // Don't cache a failed discovery — allow retry on the next login.
        cached = null;
        throw err;
      });
  }
  return cached;
}

export { oidc };
