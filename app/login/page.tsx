import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isOidcConfigured } from "@/lib/oidc";
import { safeInternalPath } from "../api/auth/shared";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "not-configured":
    "Single sign-on isn't configured yet. Set OIDC_ISSUER, OIDC_CLIENT_ID (and usually OIDC_CLIENT_SECRET + NEXORA_APP_URL) and restart.",
  discovery:
    "Couldn't reach the identity provider. Check OIDC_ISSUER and the network, then try again.",
  expired: "That sign-in attempt expired — please try again.",
  failed: "Sign-in failed at the identity provider. Please try again.",
  "no-email":
    "Your identity provider didn't release an email address. Nexora needs the email claim to map your account (scope: openid profile email).",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  if (await getSession()) redirect(safeInternalPath(next));

  const configured = isOidcConfigured();
  const loginHref = next
    ? `/api/auth/login?next=${encodeURIComponent(next)}`
    : "/api/auth/login";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-2 text-center text-2xl font-bold tracking-tight">
          Nexora<span className="text-sky-600">CRM</span>
        </div>
        <p className="mb-6 text-center text-sm text-slate-500">
          Partner relationship management
        </p>

        {error && ERRORS[error] && (
          <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {ERRORS[error]}
          </p>
        )}

        {configured ? (
          <a
            href={loginHref}
            className="block w-full rounded-md bg-sky-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-sky-700"
          >
            Sign in with SSO
          </a>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-100/60 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Single sign-on not configured</p>
            <p className="mt-1">
              Set <code>OIDC_ISSUER</code>, <code>OIDC_CLIENT_ID</code>,{" "}
              <code>OIDC_CLIENT_SECRET</code> and <code>NEXORA_APP_URL</code>{" "}
              (see README), then restart. For local development without an IdP
              you can set <code>NEXORA_AUTH_DISABLED=1</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
