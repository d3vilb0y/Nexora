/**
 * Shown instantly during navigation while the next (dynamic, DB-backed) page
 * streams in, so moving around the CRM feels responsive instead of hanging.
 * A generic shell that reads well for both list and detail pages.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-7 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
