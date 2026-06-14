import { createPartner } from "@/lib/actions";
import { listPartners, listTiers } from "@/lib/data";
import { getActiveVendor } from "@/lib/vendor";
import { formatMoney } from "@/lib/health";
import { PARTNER_STATUSES } from "@/lib/types";
import {
  Badge,
  Card,
  Empty,
  Field,
  HealthBadge,
  PartnerLink,
  TierBadge,
  btnCls,
  inputCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partners" };

export default async function PartnersPage() {
  const vendor = await getActiveVendor();
  const partners = listPartners(vendor.id);
  const tiers = listTiers(vendor.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-xl font-bold">Partners</h1>
        <span className="text-sm text-slate-500">
          in the {vendor.name} landscape
        </span>
      </div>

      <Card title="All partners">
        {partners.length === 0 ? (
          <Empty>No partners yet — add one below.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Tier</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Region</th>
                <th className="py-2 pr-4">Annual revenue</th>
                <th className="py-2 pr-4">People</th>
                <th className="py-2 pr-4">Active certs</th>
                <th className="py-2">Health</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">
                    <PartnerLink id={p.id} name={p.name} />
                  </td>
                  <td className="py-2 pr-4">
                    <TierBadge tier={p.tier} tiers={tiers} />
                  </td>
                  <td className="py-2 pr-4">
                    <Badge value={p.status} />
                  </td>
                  <td className="py-2 pr-4">{p.region || "—"}</td>
                  <td className="py-2 pr-4">{formatMoney(p.annual_revenue)}</td>
                  <td className="py-2 pr-4">{p.peopleCount}</td>
                  <td className="py-2 pr-4">
                    {p.activeCertCount}
                    {p.gap.currentTier
                      ? ` / ${p.gap.currentTier.min_active_certs}`
                      : ""}
                  </td>
                  <td className="py-2">
                    <HealthBadge health={p.health} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Add partner">
        <form action={createPartner} className="grid gap-4 md:grid-cols-3">
          <Field label="Name *">
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="Tier">
            <select name="tier" className={inputCls}>
              {tiers.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" className={inputCls}>
              {PARTNER_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Website">
            <input name="website" className={inputCls} placeholder="https://" />
          </Field>
          <Field label="Region">
            <input name="region" className={inputCls} placeholder="e.g. Nordics" />
          </Field>
          <Field label="Annual revenue (USD)">
            <input
              name="annual_revenue"
              type="number"
              min="0"
              step="1000"
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-3">
            <Field label="Notes">
              <textarea name="notes" rows={2} className={inputCls} />
            </Field>
          </div>
          <div>
            <button type="submit" className={btnCls}>
              Add partner
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
