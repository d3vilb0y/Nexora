import { requirePermission } from "@/lib/auth";
import Link from "next/link";
import { createDeal, deleteDeal, updateDealStage } from "@/lib/actions";
import { listDeals, listLogTargets } from "@/lib/data";
import { getActiveVendorId } from "@/lib/vendor";
import { formatMoney } from "@/lib/health";
import { DEAL_STAGES } from "@/lib/types";
import {
  Badge,
  Card,
  Empty,
  Field,
  PartnerLink,
  btnCls,
  btnDangerCls,
  inputCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deals" };

export default async function DealsPage() {
  await requirePermission("deals.view");
  const vendorId = await getActiveVendorId();
  const deals = listDeals(vendorId);
  const partners = listLogTargets(vendorId);
  const open = deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost");
  const wonValue = deals
    .filter((d) => d.stage === "Won")
    .reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">Partner deals</h1>
        <span className="flex items-baseline gap-4 text-sm text-slate-500">
          {open.length} active · {formatMoney(wonValue)} won all-time
          <Link
            href="/deals/import"
            className="font-medium text-sky-700 hover:underline"
          >
            Import from Salesforce →
          </Link>
        </span>
      </div>

      <Card title="Register a deal we're helping with">
        {partners.length === 0 ? (
          <Empty>Add a partner first.</Empty>
        ) : (
          <form action={createDeal} className="grid gap-4 md:grid-cols-3">
            <Field label="Partner *">
              <select name="partner_id" required className={inputCls}>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="End customer *">
              <input name="customer" required className={inputCls} />
            </Field>
            <Field label="Deal / opportunity">
              <input
                name="title"
                className={inputCls}
                placeholder="e.g. SSE rollout, 800 users"
              />
            </Field>
            <Field label="Value (USD)">
              <input
                type="number"
                name="value"
                min="0"
                step="1000"
                className={inputCls}
              />
            </Field>
            <Field label="Registered">
              <input type="date" name="registered_date" className={inputCls} />
            </Field>
            <Field label="Our support">
              <input
                name="support_provided"
                className={inputCls}
                placeholder="e.g. joint demo, pricing approval, PoC help"
              />
            </Field>
            <div className="md:col-span-3">
              <Field label="Notes">
                <textarea name="notes" rows={2} className={inputCls} />
              </Field>
            </div>
            <div>
              <button type="submit" className={btnCls}>
                Register deal
              </button>
            </div>
          </form>
        )}
      </Card>

      <Card title="All deals">
        {deals.length === 0 ? (
          <Empty>No deals registered yet.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Deal</th>
                <th className="py-2 pr-4">Partner</th>
                <th className="py-2 pr-4">Value</th>
                <th className="py-2 pr-4">Our support</th>
                <th className="py-2 pr-4">Stage</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">{d.customer}</td>
                  <td className="py-2 pr-4">{d.title || "—"}</td>
                  <td className="py-2 pr-4">
                    <PartnerLink id={d.partner_id} name={d.partner_name} />
                  </td>
                  <td className="py-2 pr-4">{formatMoney(d.value)}</td>
                  <td className="py-2 pr-4">{d.support_provided || "—"}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <Badge value={d.stage} />
                      <form
                        action={updateDealStage}
                        className="flex items-center gap-1"
                      >
                        <input type="hidden" name="id" value={d.id} />
                        <input
                          type="hidden"
                          name="partner_id"
                          value={d.partner_id}
                        />
                        <select
                          name="stage"
                          defaultValue={d.stage}
                          className="rounded-md border border-slate-300 px-1 py-0.5 text-xs"
                        >
                          {DEAL_STAGES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="text-xs text-sky-700 hover:underline"
                        >
                          Set
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="py-2">
                    <form action={deleteDeal}>
                      <input type="hidden" name="id" value={d.id} />
                      <input
                        type="hidden"
                        name="partner_id"
                        value={d.partner_id}
                      />
                      <button type="submit" className={btnDangerCls}>
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
