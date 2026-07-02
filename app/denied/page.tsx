import Link from "next/link";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Access denied" };

export default async function DeniedPage() {
  const session = await getSession();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-semibold text-rose-600">403</p>
      <h1 className="mt-2 text-2xl font-bold">You don’t have access</h1>
      <p className="mt-2 text-sm text-slate-500">
        {session
          ? `Signed in as ${session.user.email}, but this area needs a permission your roles don’t grant. Ask an administrator to adjust your access.`
          : "Sign in to continue."}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          Back to dashboard
        </Link>
        {session && !session.synthetic && (
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Sign out
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
