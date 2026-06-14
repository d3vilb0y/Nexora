import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePartner, updatePartner } from "@/lib/actions";
import { getPartnerDetail } from "@/lib/data";
import { formatMoney } from "@/lib/health";
import { PARTNER_STATUSES } from "@/lib/types";
import {
  Card,
  Field,
  HealthBadge,
  TierBadge,
  Badge,
  btnCls,
  btnDangerCls,
  inputCls,
} from "@/components/ui";
import {
  CompetitorsSection,
  DealsSection,
  EngagementsSection,
  FollowUpsSection,
  GoalsSection,
  LicensesSection,
  MdfSection,
  NeedsSection,
  OfficesSection,
  PeopleSection,
  ProblemsSection,
} from "@/components/partner-sections";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "personnel", label: "Personnel" },
  { id: "engagements", label: "Engagements" },
  { id: "economics", label: "Economics" },
  { id: "relationship", label: "Relationship" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: getPartnerDetail(Number(id))?.partner.name ?? "Partner not found",
  };
}

export default async function PartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const detail = getPartnerDetail(Number(id));
  if (!detail) notFound();

  const { partner, tiers, vendor, siblings } = detail;
  const gap = partner.gap;
  const activeTab: TabId = TABS.some((t) => t.id === tab)
    ? (tab as TabId)
    : "overview";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">{partner.name}</h1>
        <TierBadge tier={partner.tier} tiers={tiers} />
        <Badge value={partner.status} />
        <HealthBadge health={partner.health} />
        {partner.website && (
          <a
            href={partner.website}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-sky-700 hover:underline"
          >
            {partner.website}
          </a>
        )}
        <span className="text-sm text-slate-500">
          {partner.region && `· ${partner.region}`} · revenue{" "}
          {formatMoney(partner.annual_revenue)} · vendor {vendor.name}
        </span>
      </div>

      {siblings.length > 0 && (
        <div className="rounded-md border border-indigo-100 bg-indigo-50/50 px-4 py-2 text-sm text-indigo-900">
          Same company is also a partner under{" "}
          {siblings.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ", "}
              <Link
                href={`/partners/${s.id}`}
                className="font-medium hover:underline"
              >
                {s.vendor_name}
              </Link>
            </span>
          ))}
          . Sales &amp; Management contacts are shared across them.
        </div>
      )}

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => {
          const active = t.id === activeTab;
          return (
            <Link
              key={t.id}
              href={
                t.id === "overview"
                  ? `/partners/${partner.id}`
                  : `/partners/${partner.id}?tab=${t.id}`
              }
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-sky-600 text-sky-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Tier gap analysis">
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium">
                    Maintain {gap.currentTier?.name ?? partner.tier}
                  </div>
                  {gap.currentTier ? (
                    <ul className="mt-1 space-y-1 text-slate-600">
                      <li
                        className={gap.maintainCertGap > 0 ? "text-rose-600" : ""}
                      >
                        Certs: {gap.activeCertCount} /{" "}
                        {gap.currentTier.min_active_certs} active
                        {gap.maintainCertGap > 0
                          ? ` — ${gap.maintainCertGap} short, tier at risk!`
                          : " ✓"}
                      </li>
                      <li
                        className={
                          gap.maintainRevenueGap > 0 ? "text-rose-600" : ""
                        }
                      >
                        Revenue: {formatMoney(gap.annualRevenue)} /{" "}
                        {formatMoney(gap.currentTier.min_annual_revenue)}
                        {gap.maintainRevenueGap > 0
                          ? ` — ${formatMoney(gap.maintainRevenueGap)} short`
                          : " ✓"}
                      </li>
                    </ul>
                  ) : (
                    <p className="text-slate-500">
                      Tier &ldquo;{partner.tier}&rdquo; has no defined
                      requirements.
                    </p>
                  )}
                </div>
                {gap.nextTier && (
                  <div>
                    <div className="font-medium">
                      Advance to {gap.nextTier.name}
                    </div>
                    <ul className="mt-1 space-y-1 text-slate-600">
                      <li>
                        Certs: needs {gap.nextTier.min_active_certs} active
                        {gap.advanceCertGap! > 0
                          ? ` — ${gap.advanceCertGap} more required`
                          : " ✓ already met"}
                      </li>
                      <li>
                        Revenue: needs{" "}
                        {formatMoney(gap.nextTier.min_annual_revenue)}
                        {gap.advanceRevenueGap! > 0
                          ? ` — ${formatMoney(gap.advanceRevenueGap!)} more required`
                          : " ✓ already met"}
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Health score breakdown">
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <strong>Overall: {partner.health.score}/100</strong> (
                  {partner.health.label})
                </li>
                <li>
                  Certification coverage: {partner.health.certScore}/100 — active
                  certs vs. tier requirement (weight 40%)
                </li>
                <li>
                  Engagement recency: {partner.health.engagementScore}/100 —{" "}
                  {partner.lastEngagement
                    ? `last touch ${partner.daysSinceEngagement}d ago`
                    : "no touchpoints logged"}{" "}
                  (weight 35%)
                </li>
                <li>
                  Problem pressure: {partner.health.problemScore}/100 —{" "}
                  {partner.openProblemCount} open problem
                  {partner.openProblemCount === 1 ? "" : "s"} (weight 25%)
                </li>
              </ul>
            </Card>
          </div>

          <FollowUpsSection detail={detail} />
        </div>
      )}

      {activeTab === "personnel" && (
        <div className="space-y-6">
          <OfficesSection detail={detail} />
          <PeopleSection detail={detail} />
        </div>
      )}

      {activeTab === "engagements" && <EngagementsSection detail={detail} />}

      {activeTab === "economics" && (
        <div className="space-y-6">
          <DealsSection detail={detail} />
          <div className="grid gap-6 lg:grid-cols-2">
            <MdfSection detail={detail} />
            <LicensesSection detail={detail} />
          </div>
          <GoalsSection detail={detail} />
        </div>
      )}

      {activeTab === "relationship" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <NeedsSection detail={detail} />
            <CompetitorsSection detail={detail} />
          </div>
          <ProblemsSection detail={detail} />
        </div>
      )}

      {activeTab === "settings" && (
        <Card title="Edit partner">
          <form action={updatePartner} className="grid gap-4 md:grid-cols-3">
            <input type="hidden" name="id" value={partner.id} />
            <Field label="Name *">
              <input
                name="name"
                required
                defaultValue={partner.name}
                className={inputCls}
              />
            </Field>
            <Field label="Tier">
              <select
                name="tier"
                defaultValue={partner.tier}
                className={inputCls}
              >
                {tiers.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                name="status"
                defaultValue={partner.status}
                className={inputCls}
              >
                {PARTNER_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Website">
              <input
                name="website"
                defaultValue={partner.website}
                className={inputCls}
              />
            </Field>
            <Field label="Region">
              <input
                name="region"
                defaultValue={partner.region}
                className={inputCls}
              />
            </Field>
            <Field label="Annual revenue (USD)">
              <input
                type="number"
                name="annual_revenue"
                min="0"
                step="1000"
                defaultValue={partner.annual_revenue}
                className={inputCls}
              />
            </Field>
            <div className="md:col-span-3">
              <Field label="Notes">
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={partner.notes}
                  className={inputCls}
                />
              </Field>
            </div>
            <div>
              <button type="submit" className={btnCls}>
                Save changes
              </button>
            </div>
          </form>
          <form
            action={deletePartner}
            className="mt-4 border-t border-slate-100 pt-3"
          >
            <input type="hidden" name="id" value={partner.id} />
            <button type="submit" className={btnDangerCls}>
              Delete partner and all related data
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
