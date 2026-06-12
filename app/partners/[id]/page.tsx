import { notFound } from "next/navigation";
import { deletePartner, updatePartner } from "@/lib/actions";
import { getPartnerDetail } from "@/lib/data";
import { formatMoney } from "@/lib/health";
import { PARTNER_STATUSES } from "@/lib/types";
import {
  Badge,
  Card,
  Field,
  HealthBadge,
  btnCls,
  btnDangerCls,
  inputCls,
} from "@/components/ui";
import {
  CompetitorsSection,
  DealsSection,
  EngagementsSection,
  GoalsSection,
  LicensesSection,
  MdfSection,
  NeedsSection,
  OfficesSection,
  PeopleSection,
  ProblemsSection,
} from "@/components/partner-sections";

export const dynamic = "force-dynamic";

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = getPartnerDetail(Number(id));
  if (!detail) notFound();

  const { partner, tiers } = detail;
  const gap = partner.gap;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">{partner.name}</h1>
        <Badge value={partner.tier} />
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
          {formatMoney(partner.annual_revenue)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tier gap analysis">
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium">
                Maintain {gap.currentTier?.name ?? partner.tier}
              </div>
              {gap.currentTier ? (
                <ul className="mt-1 space-y-1 text-slate-600">
                  <li className={gap.maintainCertGap > 0 ? "text-rose-600" : ""}>
                    Certs: {gap.activeCertCount} /{" "}
                    {gap.currentTier.min_active_certs} active
                    {gap.maintainCertGap > 0
                      ? ` — ${gap.maintainCertGap} short, tier at risk!`
                      : " ✓"}
                  </li>
                  <li
                    className={gap.maintainRevenueGap > 0 ? "text-rose-600" : ""}
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
                  Tier &ldquo;{partner.tier}&rdquo; has no defined requirements.
                </p>
              )}
            </div>
            {gap.nextTier && (
              <div>
                <div className="font-medium">Advance to {gap.nextTier.name}</div>
                <ul className="mt-1 space-y-1 text-slate-600">
                  <li>
                    Certs: needs {gap.nextTier.min_active_certs} active
                    {gap.advanceCertGap! > 0
                      ? ` — ${gap.advanceCertGap} more required`
                      : " ✓ already met"}
                  </li>
                  <li>
                    Revenue: needs {formatMoney(gap.nextTier.min_annual_revenue)}
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

      <OfficesSection detail={detail} />
      <PeopleSection detail={detail} />
      <EngagementsSection detail={detail} />
      <DealsSection detail={detail} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MdfSection detail={detail} />
        <LicensesSection detail={detail} />
      </div>

      <GoalsSection detail={detail} />

      <div className="grid gap-6 lg:grid-cols-2">
        <NeedsSection detail={detail} />
        <CompetitorsSection detail={detail} />
      </div>

      <ProblemsSection detail={detail} />

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
            <select name="tier" defaultValue={partner.tier} className={inputCls}>
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
        <form action={deletePartner} className="mt-4 border-t border-slate-100 pt-3">
          <input type="hidden" name="id" value={partner.id} />
          <button type="submit" className={btnDangerCls}>
            Delete partner and all related data
          </button>
        </form>
      </Card>
    </div>
  );
}
