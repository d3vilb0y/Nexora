import { updateTier } from "@/lib/actions";
import { listTiers } from "@/lib/data";
import { getActiveVendor } from "@/lib/vendor";
import { Badge, Card, Field, btnCls, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tiers" };

export default async function TiersPage() {
  const vendor = await getActiveVendor();
  const tiers = listTiers(vendor.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">
        {vendor.name} partner program tiers
      </h1>
      <p className="text-sm text-slate-500">
        Requirements set here drive the gap analysis, tier-at-risk alerts and
        the certification part of each partner&rsquo;s health score — for the{" "}
        {vendor.name} landscape. Each vendor has its own tier ladder.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <Card key={t.id} title={`${t.name} (rank ${t.rank})`}>
            <div className="mb-3">
              <Badge value={t.name} />
            </div>
            <form action={updateTier} className="space-y-3">
              <input type="hidden" name="id" value={t.id} />
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
              <button type="submit" className={btnCls}>
                Save
              </button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
