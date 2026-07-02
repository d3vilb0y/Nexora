import { requirePermission } from "@/lib/auth";
import Link from "next/link";
import { importDealsFromCsv, importDealsFromSalesforceApi } from "@/lib/actions";
import { salesforceAuthMode } from "@/lib/deal-import";
import { Card, btnCls } from "@/components/ui";

const AUTH_LABELS: Record<string, string> = {
  "oauth-refresh": "OAuth (refresh-token grant)",
  "oauth-client-credentials": "OAuth (client-credentials grant)",
  "static-token": "static access token (legacy — expires)",
};

export const dynamic = "force-dynamic";
export const metadata = { title: "Import deals" };

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string;
    updated?: string;
    skipped?: string;
    error?: string;
  }>;
}) {
  await requirePermission("deals.import");
  const params = await searchParams;
  const authMode = salesforceAuthMode();
  const apiReady = authMode !== "none";

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Import deals from Salesforce</h1>
        <Link href="/deals" className="text-sm text-sky-700 hover:underline">
          ← Back to deals
        </Link>
      </div>

      {params.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {params.error}
        </div>
      )}
      {(params.imported || params.updated) && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Imported {params.imported ?? 0} new deal(s), updated{" "}
          {params.updated ?? 0} existing.
          {params.skipped && (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">
                Skipped rows
              </summary>
              <pre className="mt-1 text-xs whitespace-pre-wrap text-emerald-900">
                {params.skipped}
              </pre>
            </details>
          )}
        </div>
      )}

      <Card title="Upload a Salesforce report (CSV)">
        <form action={importDealsFromCsv} className="space-y-4">
          <p className="text-sm text-slate-600">
            Export an opportunity report from Salesforce as CSV and upload it
            here. Recognized columns (case-insensitive):{" "}
            <code className="rounded bg-slate-100 px-1">Partner</code> (or
            Partner Name / Partner Account),{" "}
            <code className="rounded bg-slate-100 px-1">Account Name</code>,{" "}
            <code className="rounded bg-slate-100 px-1">Opportunity Name</code>,{" "}
            <code className="rounded bg-slate-100 px-1">Amount</code>,{" "}
            <code className="rounded bg-slate-100 px-1">Stage</code>,{" "}
            <code className="rounded bg-slate-100 px-1">Close Date</code> and
            optionally{" "}
            <code className="rounded bg-slate-100 px-1">Opportunity ID</code> —
            with an ID, re-importing the same report updates deals instead of
            duplicating them. Partners are matched by name; unmatched rows are
            listed as skipped.
          </p>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
          <button type="submit" className={btnCls}>
            Import CSV
          </button>
        </form>
      </Card>

      <Card title="Sync directly from the Salesforce API">
        {apiReady ? (
          <form action={importDealsFromSalesforceApi} className="space-y-3">
            <p className="text-sm text-slate-600">
              Authenticating via{" "}
              <span className="font-medium">{AUTH_LABELS[authMode]}</span>. Pulls
              the 200 most recent opportunities and matches partners by name.
              {authMode.startsWith("oauth") && (
                <>
                  {" "}
                  Access tokens are fetched and refreshed automatically, and
                  re-issued on expiry.
                </>
              )}
              {authMode === "static-token" && (
                <>
                  {" "}
                  Heads up: a static token expires — set{" "}
                  <code className="rounded bg-slate-100 px-1">SF_CLIENT_ID</code>{" "}
                  and{" "}
                  <code className="rounded bg-slate-100 px-1">
                    SF_CLIENT_SECRET
                  </code>{" "}
                  to switch to auto-refreshing OAuth.
                </>
              )}
            </p>
            <button type="submit" className={btnCls}>
              Sync from Salesforce
            </button>
          </form>
        ) : (
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Not configured. The recommended setup is an auto-refreshing OAuth
              connected app — set these (e.g. in{" "}
              <code className="rounded bg-slate-100 px-1">.env.local</code>) and
              restart:
            </p>
            <pre className="rounded-md bg-slate-100 p-3 text-xs">
              {`# OAuth client-credentials (server-to-server, recommended)
SF_CLIENT_ID=<connected app consumer key>
SF_CLIENT_SECRET=<connected app consumer secret>
# optional — refresh-token grant instead of client-credentials:
SF_REFRESH_TOKEN=<refresh token>
# optional:
SF_LOGIN_URL=https://login.salesforce.com   # token host (use test.salesforce.com for sandboxes)
SF_INSTANCE_URL=https://yourorg.my.salesforce.com  # used if the token omits instance_url
SF_PARTNER_FIELD=Partner_Account__r.Name    # field holding the partner name (default Account.Name)
SF_SOQL_WHERE=Partner_Account__c != null    # extra opportunity filter`}
            </pre>
            <p className="text-xs text-slate-500">
              A pre-issued{" "}
              <code className="rounded bg-slate-100 px-1">SF_ACCESS_TOKEN</code>{" "}
              (with{" "}
              <code className="rounded bg-slate-100 px-1">SF_INSTANCE_URL</code>)
              still works for a quick test, but it expires and won&rsquo;t
              auto-renew.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
