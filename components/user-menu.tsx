/**
 * Who's signed in + sign out. A plain form POST so it works without JS and
 * clears the session server-side before the IdP round-trip.
 */
export function UserMenu({
  name,
  email,
  synthetic,
}: {
  name: string;
  email: string;
  synthetic: boolean;
}) {
  if (synthetic) {
    return (
      <span
        className="rounded-md border border-amber-300 bg-amber-100/70 px-2 py-1 text-xs font-medium text-amber-900"
        title="NEXORA_AUTH_DISABLED=1 — everyone gets full access. Don't use in production."
      >
        Auth disabled
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden max-w-40 truncate text-xs text-slate-500 lg:inline"
        title={email}
      >
        {name || email}
      </span>
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
