import Link from "next/link";
import { getDashboard, listOpenDeals } from "@/lib/data";
import { getActiveVendorId } from "@/lib/vendor";
import { formatMoney } from "@/lib/health";
import { Badge, Card, Empty, HealthBadge, PartnerLink } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const vendorId = await getActiveVendorId();
  const data = getDashboard(vendorId);
  const openDeals = listOpenDeals(vendorId);
  const activePartners = data.partners.filter((p) => p.status === "Active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Link
          href="/partners"
          className="text-sm font-medium text-sky-700 hover:underline"
        >
          Manage partners →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Active partners" value={activePartners.length} />
        <Stat
          label="Certs expiring ≤90d"
          value={data.expiringCerts.length}
          warn={data.expiringCerts.length > 0}
        />
        <Stat
          label="Tiers at risk"
          value={data.tierAtRisk.length}
          warn={data.tierAtRisk.length > 0}
        />
        <Stat
          label="Quiet partners (60d+)"
          value={data.quietPartners.length}
          warn={data.quietPartners.length > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Follow-ups due"
          action={
            <Link
              href="/activity"
              className="text-xs font-medium text-sky-700 hover:underline"
            >
              Activity →
            </Link>
          }
        >
          {data.openFollowUps.length === 0 ? (
            <Empty>No open follow-ups. Inbox zero.</Empty>
          ) : (
            <ul className="space-y-2">
              {data.openFollowUps.map((f) => (
                <li key={f.id} className="flex items-baseline gap-2 text-sm">
                  <span
                    className={`font-semibold whitespace-nowrap ${f.overdue ? "text-rose-600" : "text-slate-400"}`}
                  >
                    {f.due_date
                      ? f.overdue
                        ? `overdue ${f.due_date}`
                        : `due ${f.due_date}`
                      : "no date"}
                  </span>
                  <span>
                    {f.title} —{" "}
                    <PartnerLink id={f.partner_id} name={f.partner_name} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Certification expiry alerts">
          {data.expiringCerts.length === 0 ? (
            <Empty>No certifications expiring in the next 90 days.</Empty>
          ) : (
            <ul className="space-y-2">
              {data.expiringCerts.map((c) => (
                <li key={c.id} className="flex items-baseline gap-2 text-sm">
                  <span
                    className={`font-semibold whitespace-nowrap ${c.days < 0 ? "text-rose-600" : c.days <= 30 ? "text-orange-600" : "text-amber-600"}`}
                  >
                    {c.days < 0
                      ? `expired ${Math.abs(c.days)}d ago`
                      : `${c.days}d left`}
                  </span>
                  <span>
                    <strong>{c.person_name}</strong>&rsquo;s {c.name}
                    {c.level ? ` (${c.level})` : ""} cert{" "}
                    {c.days < 0 ? "expired" : "expires"} on {c.expiry_date} —{" "}
                    <PartnerLink id={c.partner_id} name={c.partner_name} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tier at risk (gap analysis)">
          {data.tierAtRisk.length === 0 ? (
            <Empty>All partners meet their current tier requirements.</Empty>
          ) : (
            <ul className="space-y-2">
              {data.tierAtRisk.map((p) => (
                <li key={p.id} className="text-sm">
                  <PartnerLink id={p.id} name={p.name} />{" "}
                  <Badge value={p.tier} /> —{" "}
                  {p.gap.maintainCertGap > 0 && (
                    <span>
                      {p.gap.maintainCertGap} more active cert
                      {p.gap.maintainCertGap > 1 ? "s" : ""} needed
                    </span>
                  )}
                  {p.gap.maintainCertGap > 0 && p.gap.maintainRevenueGap > 0
                    ? " and "
                    : ""}
                  {p.gap.maintainRevenueGap > 0 && (
                    <span>
                      ${p.gap.maintainRevenueGap.toLocaleString()} revenue short
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Gone quiet (no touchpoint in 60+ days)">
          {data.quietPartners.length === 0 ? (
            <Empty>Every active partner has a recent touchpoint.</Empty>
          ) : (
            <ul className="space-y-2">
              {data.quietPartners.map((p) => (
                <li key={p.id} className="text-sm">
                  <PartnerLink id={p.id} name={p.name} /> —{" "}
                  {p.lastEngagement
                    ? `last touch ${p.lastEngagement} (${p.daysSinceEngagement}d ago)`
                    : "no engagement logged yet"}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Open high-severity problems">
          {data.hotProblems.length === 0 ? (
            <Empty>No open High or Critical problems.</Empty>
          ) : (
            <ul className="space-y-2">
              {data.hotProblems.map((pr) => (
                <li key={pr.id} className="flex items-baseline gap-2 text-sm">
                  <Badge value={pr.severity} />
                  <span>
                    {pr.title} —{" "}
                    <PartnerLink id={pr.partner_id} name={pr.partner_name} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent departures (last 90 days)">
          {data.recentDepartures.length === 0 ? (
            <Empty>No tracked departures recently.</Empty>
          ) : (
            <ul className="space-y-2">
              {data.recentDepartures.map((p) => (
                <li key={p.id} className="text-sm">
                  <strong>{p.name}</strong> left{" "}
                  <PartnerLink id={p.eff_partner_id} name={p.partner_name} /> on{" "}
                  {p.departed_at}
                  {p.departed_to ? ` → now at ${p.departed_to}` : ""}
                  {p.linkedin_url ? (
                    <>
                      {" "}
                      <a
                        href={p.linkedin_url}
                        className="text-sky-700 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        LinkedIn
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Active deals we're supporting"
          action={
            <Link
              href="/deals"
              className="text-xs font-medium text-sky-700 hover:underline"
            >
              All deals →
            </Link>
          }
        >
          {openDeals.length === 0 ? (
            <Empty>No open partner deals registered.</Empty>
          ) : (
            <ul className="space-y-2">
              {openDeals.map((d) => (
                <li key={d.id} className="flex items-baseline gap-2 text-sm">
                  <Badge value={d.stage} />
                  <span>
                    <strong>{d.customer}</strong>
                    {d.title ? ` — ${d.title}` : ""} ·{" "}
                    {formatMoney(d.value)} via{" "}
                    <PartnerLink id={d.partner_id} name={d.partner_name} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="License / NFR expiries (≤60 days)">
          {data.expiringLicenses.length === 0 ? (
            <Empty>No licenses expiring in the next 60 days.</Empty>
          ) : (
            <ul className="space-y-2">
              {data.expiringLicenses.map((l) => (
                <li key={l.id} className="text-sm">
                  <strong>{l.product}</strong> ({l.kind}) at{" "}
                  <PartnerLink id={l.partner_id} name={l.partner_name} /> —{" "}
                  {l.days < 0
                    ? `expired ${Math.abs(l.days)}d ago`
                    : `expires in ${l.days}d`}{" "}
                  ({l.expiry_date})
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Partner health">
        {data.partners.length === 0 ? (
          <Empty>
            No partners yet.{" "}
            <Link href="/partners" className="text-sky-700 hover:underline">
              Add your first partner
            </Link>
            .
          </Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4">Partner</th>
                <th className="py-2 pr-4">Tier</th>
                <th className="py-2 pr-4">Health</th>
                <th className="py-2 pr-4">Active certs</th>
                <th className="py-2 pr-4">Last touch</th>
                <th className="py-2 pr-4">Open problems</th>
                <th className="py-2">Open needs</th>
              </tr>
            </thead>
            <tbody>
              {[...data.partners]
                .sort((a, b) => a.health.score - b.health.score)
                .map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">
                      <PartnerLink id={p.id} name={p.name} />
                    </td>
                    <td className="py-2 pr-4">
                      <Badge value={p.tier} />
                    </td>
                    <td className="py-2 pr-4">
                      <HealthBadge health={p.health} />
                    </td>
                    <td className="py-2 pr-4">
                      {p.activeCertCount}
                      {p.gap.currentTier
                        ? ` / ${p.gap.currentTier.min_active_certs} required`
                        : ""}
                    </td>
                    <td className="py-2 pr-4">
                      {p.lastEngagement
                        ? `${p.lastEngagement} (${p.daysSinceEngagement}d)`
                        : "never"}
                    </td>
                    <td className="py-2 pr-4">{p.openProblemCount}</td>
                    <td className="py-2">{p.openNeedCount}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`text-2xl font-bold ${warn ? "text-amber-600" : "text-slate-900"}`}
      >
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
