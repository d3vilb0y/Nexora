import { createTier, deleteTier, moveTier, updateTier } from "@/lib/actions";
import { listTiers } from "@/lib/data";
import { getActiveVendor } from "@/lib/vendor";
import {
  Card,
  Field,
  TierBadge,
  btnCls,
  btnDangerCls,
  inputCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tiers" };

export default async function TiersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const vendor = await getActiveVendor();
  // listTiers is ascending by rank; show the ladder best-first (highest rank on top).
  const ladder = [...listTiers(vendor.id)].reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{vendor.name} partner program tiers</h1>
      <p className="text-sm text-slate-500">
        Define {vendor.name}&rsquo;s own tier ladder — add, rename, reorder or
        remove levels. Requirements drive the gap analysis, tier-at-risk alerts
        and the certification part of each partner&rsquo;s health score. Each
        vendor has its own ladder.
      </p>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <div className="space-y-4">
        {ladder.map((t, i) => (
          <div
            key={t.id}
            className="rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
              <TierBadge tier={t.name} tiers={ladder} />
              <span className="text-xs text-slate-400">rank {t.rank}</span>
              <div className="ml-auto flex items-center gap-1">
                <ReorderButton id={t.id} dir="up" disabled={i === 0} />
                <ReorderButton
                  id={t.id}
                  dir="down"
                  disabled={i === ladder.length - 1}
                />
                <form action={deleteTier}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className={btnDangerCls}>
                    Delete
                  </button>
                </form>
              </div>
            </div>
            <form
              action={updateTier}
              className="grid items-end gap-3 p-4 sm:grid-cols-3"
            >
              <input type="hidden" name="id" value={t.id} />
              <Field label="Tier name">
                <input
                  type="text"
                  name="name"
                  defaultValue={t.name}
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Minimum active certifications">
                <input
                  type="number"
                  name="min_active_certs"
                  min="0"
                  defaultValue={t.min_active_certs}
                  className={inputCls}
                />
              </Field>
              <Field label="Minimum annual revenue (USD)">
                <input
                  type="number"
                  name="min_annual_revenue"
                  min="0"
                  step="10000"
                  defaultValue={t.min_annual_revenue}
                  className={inputCls}
                />
              </Field>
              <div className="sm:col-span-3">
                <button type="submit" className={btnCls}>
                  Save
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>

      <Card title="Add a tier">
        <form
          action={createTier}
          className="grid items-end gap-3 sm:grid-cols-3"
        >
          <Field label="Tier name">
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Platinum"
              className={inputCls}
            />
          </Field>
          <Field label="Minimum active certifications">
            <input
              type="number"
              name="min_active_certs"
              min="0"
              defaultValue={0}
              className={inputCls}
            />
          </Field>
          <Field label="Minimum annual revenue (USD)">
            <input
              type="number"
              name="min_annual_revenue"
              min="0"
              step="10000"
              defaultValue={0}
              className={inputCls}
            />
          </Field>
          <div className="sm:col-span-3">
            <button type="submit" className={btnCls}>
              Add tier
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function ReorderButton({
  id,
  dir,
  disabled,
}: {
  id: number;
  dir: "up" | "down";
  disabled: boolean;
}) {
  return (
    <form action={moveTier}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="dir" value={dir} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={dir === "up" ? "Move tier up" : "Move tier down"}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {dir === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}
