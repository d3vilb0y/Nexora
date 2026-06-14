import Link from "next/link";

/**
 * Branded 404 — rendered inside the app shell (header, nav, theme) so a missing
 * record never dumps the user onto a bare error page with no way back.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-semibold text-sky-700">404</p>
      <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        That record or page doesn’t exist — it may have been removed, or the link
        is out of date.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
