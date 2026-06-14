"use client";

import { useEffect } from "react";

/**
 * Page-level error boundary. Keeps the user inside the app shell when a server
 * action or query throws, shows a readable message, and offers a one-click
 * retry instead of a hard reload.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-semibold text-rose-600">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-bold">This page hit an error</h1>
      <p className="mt-2 text-sm text-slate-500">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
      >
        Try again
      </button>
    </div>
  );
}
