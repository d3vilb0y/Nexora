import { getDb } from "./db";
import {
  certStatus,
  computeHealth,
  daysSince,
  gapAnalysis,
  type GapAnalysis,
  type HealthScore,
} from "./health";
import type {
  BusinessGoal,
  Certification,
  Competitor,
  Deal,
  Engagement,
  License,
  MdfEntry,
  Need,
  Office,
  Partner,
  Person,
  Problem,
  Tier,
  Vendor,
} from "./types";

const TODAY = () => new Date().toISOString().slice(0, 10);

export function listTiers(vendorId: number): Tier[] {
  return getDb()
    .prepare("SELECT * FROM tiers WHERE vendor_id = ? ORDER BY rank")
    .all(vendorId) as Tier[];
}

/**
 * SQL predicate (using named params @pid / @cid) for "this person belongs to
 * partner @pid": either anchored to that partner directly, or a company-wide
 * (Sales/Management) person of that partner's company @cid.
 */
const PERSON_IN_PARTNER = `(
  (pe.partner_id = @pid AND pe.company_wide = 0)
  OR (pe.company_id = @cid AND pe.company_wide = 1)
)`;

/**
 * SQL (named param @vendor) for the partner a person maps to within a vendor:
 * their home partner when anchored, or the company's partner row in that vendor
 * when company-wide.
 */
const EFF_PARTNER_ID = `(CASE WHEN pe.company_wide = 1
  THEN (SELECT p2.id FROM partners p2 WHERE p2.company_id = pe.company_id AND p2.vendor_id = @vendor)
  ELSE pe.partner_id END)`;

/** SQL (named param @vendor) for "this person appears in the vendor's landscape". */
const PERSON_IN_VENDOR = `(
  (pe.company_wide = 0 AND pe.partner_id IN (SELECT id FROM partners WHERE vendor_id = @vendor))
  OR (pe.company_wide = 1 AND pe.company_id IN (SELECT company_id FROM partners WHERE vendor_id = @vendor))
)`;

/** Count certs that count toward tier requirements: vendor-specific, held by active people, not expired. */
function activeCertCountFor(partner: Partner): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c
       FROM certifications cf
       JOIN people pe ON pe.id = cf.person_id
       WHERE cf.vendor_id = @vendor AND pe.status = 'Active'
         AND (cf.expiry_date = '' OR cf.expiry_date >= @today)
         AND ${PERSON_IN_PARTNER}`
    )
    .get({
      vendor: partner.vendor_id,
      today: TODAY(),
      pid: partner.id,
      cid: partner.company_id,
    }) as { c: number };
  return row.c;
}

function lastEngagementFor(partnerId: number): string | null {
  const row = getDb()
    .prepare(
      `SELECT MAX(e.date) AS d FROM engagements e
       JOIN engagement_partners ep ON ep.engagement_id = e.id
       WHERE ep.partner_id = ?`
    )
    .get(partnerId) as { d: string | null };
  return row.d;
}

function openProblemsFor(partnerId: number): Problem[] {
  return getDb()
    .prepare(
      "SELECT * FROM problems WHERE partner_id = ? AND status != 'Resolved' ORDER BY created_at DESC"
    )
    .all(partnerId) as Problem[];
}

export type PartnerSummary = Partner & {
  activeCertCount: number;
  peopleCount: number;
  lastEngagement: string | null;
  daysSinceEngagement: number | null;
  openProblemCount: number;
  openNeedCount: number;
  health: HealthScore;
  gap: GapAnalysis;
};

function summarize(partner: Partner, tiers: Tier[]): PartnerSummary {
  const db = getDb();
  const activeCertCount = activeCertCountFor(partner);
  const lastEngagement = lastEngagementFor(partner.id);
  const openProblems = openProblemsFor(partner.id);
  const peopleCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM people pe
         WHERE pe.status = 'Active' AND ${PERSON_IN_PARTNER}`
      )
      .get({ pid: partner.id, cid: partner.company_id }) as { c: number }
  ).c;
  const openNeedCount = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM needs WHERE partner_id = ? AND status != 'Done'"
      )
      .get(partner.id) as { c: number }
  ).c;
  const gap = gapAnalysis(
    tiers,
    partner.tier,
    activeCertCount,
    partner.annual_revenue
  );
  const health = computeHealth({
    activeCertCount,
    requiredCerts: gap.currentTier?.min_active_certs ?? 0,
    daysSinceLastEngagement: lastEngagement ? daysSince(lastEngagement) : null,
    openProblems,
  });
  return {
    ...partner,
    activeCertCount,
    peopleCount,
    lastEngagement,
    daysSinceEngagement: lastEngagement ? daysSince(lastEngagement) : null,
    openProblemCount: openProblems.length,
    openNeedCount,
    health,
    gap,
  };
}

export function listPartners(vendorId: number): PartnerSummary[] {
  const tiers = listTiers(vendorId);
  const partners = getDb()
    .prepare(
      "SELECT * FROM partners WHERE vendor_id = ? ORDER BY name COLLATE NOCASE"
    )
    .all(vendorId) as Partner[];
  return partners.map((p) => summarize(p, tiers));
}

export type PersonWithCerts = Person & {
  certifications: Certification[];
  office_name: string | null;
};

export type EngagementRow = Engagement & {
  attendees: string | null;
  partner_names: string | null;
};

export type SiblingPartner = { id: number; vendor_name: string };

export type PartnerDetail = {
  partner: PartnerSummary;
  vendor: Vendor;
  siblings: SiblingPartner[];
  offices: (Office & { people_count: number })[];
  people: PersonWithCerts[];
  engagements: EngagementRow[];
  deals: Deal[];
  mdfEntries: MdfEntry[];
  mdfBalance: number;
  licenses: License[];
  goals: BusinessGoal[];
  competitors: Competitor[];
  needs: Need[];
  problems: Problem[];
  tiers: Tier[];
};

const ATTENDEES_SUBQUERY = `(
  SELECT GROUP_CONCAT(p2.name, ', ') FROM engagement_attendees ea
  JOIN people p2 ON p2.id = ea.person_id
  WHERE ea.engagement_id = e.id
) AS attendees`;

const PARTNERS_SUBQUERY = `(
  SELECT GROUP_CONCAT(pa2.name, ', ') FROM engagement_partners ep2
  JOIN partners pa2 ON pa2.id = ep2.partner_id
  WHERE ep2.engagement_id = e.id
) AS partner_names`;

export function getPartnerDetail(id: number): PartnerDetail | null {
  const db = getDb();
  const partner = db
    .prepare("SELECT * FROM partners WHERE id = ?")
    .get(id) as Partner | undefined;
  if (!partner) return null;
  const vendor = db
    .prepare("SELECT * FROM vendors WHERE id = ?")
    .get(partner.vendor_id) as Vendor;
  const tiers = listTiers(partner.vendor_id);

  const peopleParams = { pid: id, cid: partner.company_id };
  const people = db
    .prepare(
      `SELECT pe.*, o.name AS office_name FROM people pe
       LEFT JOIN offices o ON o.id = pe.office_id
       WHERE ${PERSON_IN_PARTNER} ORDER BY pe.status, pe.name COLLATE NOCASE`
    )
    .all(peopleParams) as (Person & { office_name: string | null })[];
  // Only this vendor's certs surface here, so a shared person shows the right
  // ones under each vendor.
  const certsByPerson = db
    .prepare(
      `SELECT cf.* FROM certifications cf
       JOIN people pe ON pe.id = cf.person_id
       WHERE cf.vendor_id = @vendor AND ${PERSON_IN_PARTNER}
       ORDER BY cf.expiry_date`
    )
    .all({ ...peopleParams, vendor: partner.vendor_id }) as Certification[];

  const engagements = db
    .prepare(
      `SELECT e.*, ${ATTENDEES_SUBQUERY}, ${PARTNERS_SUBQUERY} FROM engagements e
       JOIN engagement_partners ep ON ep.engagement_id = e.id
       WHERE ep.partner_id = ? ORDER BY e.date DESC`
    )
    .all(id) as EngagementRow[];

  const mdfEntries = db
    .prepare(
      "SELECT * FROM mdf_entries WHERE partner_id = ? ORDER BY entry_date DESC"
    )
    .all(id) as MdfEntry[];
  const mdfBalance = mdfEntries.reduce(
    (sum, e) => sum + (e.kind === "Allocation" ? e.amount : -e.amount),
    0
  );

  const siblings = db
    .prepare(
      `SELECT pa.id, v.name AS vendor_name FROM partners pa
       JOIN vendors v ON v.id = pa.vendor_id
       WHERE pa.company_id = ? AND pa.id != ?
       ORDER BY v.name COLLATE NOCASE`
    )
    .all(partner.company_id, id) as SiblingPartner[];

  return {
    partner: summarize(partner, tiers),
    vendor,
    siblings,
    offices: db
      .prepare(
        `SELECT o.*, (SELECT COUNT(*) FROM people p WHERE p.office_id = o.id AND p.status = 'Active') AS people_count
         FROM offices o WHERE o.partner_id = ? ORDER BY o.name COLLATE NOCASE`
      )
      .all(id) as (Office & { people_count: number })[],
    people: people.map((person) => ({
      ...person,
      certifications: certsByPerson.filter((c) => c.person_id === person.id),
    })),
    engagements,
    deals: db
      .prepare(
        `SELECT * FROM deals WHERE partner_id = ?
         ORDER BY CASE WHEN stage IN ('Won','Lost') THEN 1 ELSE 0 END, registered_date DESC`
      )
      .all(id) as Deal[],
    mdfEntries,
    mdfBalance,
    licenses: db
      .prepare(
        "SELECT * FROM licenses WHERE partner_id = ? ORDER BY expiry_date"
      )
      .all(id) as License[],
    goals: db
      .prepare(
        "SELECT * FROM business_goals WHERE partner_id = ? ORDER BY year DESC, created_at"
      )
      .all(id) as BusinessGoal[],
    competitors: db
      .prepare(
        "SELECT * FROM competitors WHERE partner_id = ? ORDER BY vendor COLLATE NOCASE"
      )
      .all(id) as Competitor[],
    needs: db
      .prepare(
        "SELECT * FROM needs WHERE partner_id = ? ORDER BY status != 'Done' DESC, created_at DESC"
      )
      .all(id) as Need[],
    problems: db
      .prepare(
        "SELECT * FROM problems WHERE partner_id = ? ORDER BY status != 'Resolved' DESC, created_at DESC"
      )
      .all(id) as Problem[],
    tiers,
  };
}

export type PersonDirectoryRow = Person & {
  /** The partner this person maps to within the current vendor (for linking). */
  eff_partner_id: number;
  partner_name: string;
  office_name: string | null;
  cert_count: number;
  last_touch: string | null;
};

export function listPeople(vendorId: number): PersonDirectoryRow[] {
  return getDb()
    .prepare(
      `SELECT pe.*,
        ${EFF_PARTNER_ID} AS eff_partner_id,
        (SELECT c.name FROM companies c WHERE c.id = pe.company_id) AS partner_name,
        (SELECT o.name FROM offices o WHERE o.id = pe.office_id) AS office_name,
        (SELECT COUNT(*) FROM certifications cf WHERE cf.person_id = pe.id AND cf.vendor_id = @vendor) AS cert_count,
        (SELECT MAX(e.date) FROM engagements e
         JOIN engagement_attendees ea ON ea.engagement_id = e.id
         WHERE ea.person_id = pe.id) AS last_touch
       FROM people pe
       WHERE ${PERSON_IN_VENDOR}
       ORDER BY pe.status, pe.name COLLATE NOCASE`
    )
    .all({ vendor: vendorId }) as PersonDirectoryRow[];
}

export type CertRow = Certification & {
  person_name: string;
  person_status: string;
  partner_id: number;
  partner_name: string;
};

export function listCertifications(vendorId: number): CertRow[] {
  return getDb()
    .prepare(
      `SELECT cf.*, pe.name AS person_name, pe.status AS person_status,
              ${EFF_PARTNER_ID} AS partner_id,
              (SELECT c.name FROM companies c WHERE c.id = pe.company_id) AS partner_name
       FROM certifications cf
       JOIN people pe ON pe.id = cf.person_id
       WHERE cf.vendor_id = @vendor
       ORDER BY CASE WHEN cf.expiry_date = '' THEN 1 ELSE 0 END, cf.expiry_date`
    )
    .all({ vendor: vendorId }) as CertRow[];
}

export type DashboardData = {
  partners: PartnerSummary[];
  expiringCerts: (CertRow & { days: number })[];
  expiringLicenses: (License & { partner_name: string; days: number })[];
  quietPartners: PartnerSummary[];
  tierAtRisk: PartnerSummary[];
  recentDepartures: (Person & { partner_name: string; eff_partner_id: number })[];
  hotProblems: (Problem & { partner_name: string })[];
};

export function getDashboard(vendorId: number): DashboardData {
  const db = getDb();
  const partners = listPartners(vendorId);

  const expiringCerts = listCertifications(vendorId)
    .filter((c) => c.person_status === "Active")
    .map((c) => ({ ...c, days: certStatus(c.expiry_date).days }))
    .filter(
      (c): c is CertRow & { days: number } => c.days !== null && c.days <= 90
    )
    .sort((a, b) => a.days - b.days);

  const expiringLicenses = (
    db
      .prepare(
        `SELECT l.*, pa.name AS partner_name FROM licenses l
         JOIN partners pa ON pa.id = l.partner_id
         WHERE pa.vendor_id = ? AND l.expiry_date != '' ORDER BY l.expiry_date`
      )
      .all(vendorId) as (License & { partner_name: string })[]
  )
    .map((l) => ({ ...l, days: certStatus(l.expiry_date).days as number }))
    .filter((l) => l.days !== null && l.days <= 60);

  const quietPartners = partners.filter(
    (p) =>
      p.status === "Active" &&
      (p.daysSinceEngagement === null || p.daysSinceEngagement > 60)
  );

  const tierAtRisk = partners.filter(
    (p) => p.status === "Active" && p.gap.tierAtRisk
  );

  const cutoff = new Date(Date.now() - 90 * 86400000)
    .toISOString()
    .slice(0, 10);
  const recentDepartures = db
    .prepare(
      `SELECT pe.*,
        ${EFF_PARTNER_ID} AS eff_partner_id,
        (SELECT c.name FROM companies c WHERE c.id = pe.company_id) AS partner_name
       FROM people pe
       WHERE pe.status = 'Departed' AND pe.departed_at >= @cutoff AND ${PERSON_IN_VENDOR}
       ORDER BY pe.departed_at DESC`
    )
    .all({ vendor: vendorId, cutoff }) as (Person & {
    partner_name: string;
    eff_partner_id: number;
  })[];

  const hotProblems = db
    .prepare(
      `SELECT pr.*, pa.name AS partner_name FROM problems pr
       JOIN partners pa ON pa.id = pr.partner_id
       WHERE pa.vendor_id = ? AND pr.status != 'Resolved' AND pr.severity IN ('High','Critical')
       ORDER BY CASE pr.severity WHEN 'Critical' THEN 0 ELSE 1 END, pr.created_at DESC`
    )
    .all(vendorId) as (Problem & { partner_name: string })[];

  return {
    partners,
    expiringCerts,
    expiringLicenses,
    quietPartners,
    tierAtRisk,
    recentDepartures,
    hotProblems,
  };
}

export type FeedEngagement = EngagementRow & { partner_name: string };

export function listRecentEngagements(
  vendorId: number,
  limit = 25
): FeedEngagement[] {
  return getDb()
    .prepare(
      `SELECT e.*, pa.name AS partner_name, ${ATTENDEES_SUBQUERY}, ${PARTNERS_SUBQUERY}
       FROM engagements e
       JOIN partners pa ON pa.id = e.partner_id
       WHERE pa.vendor_id = ?
       ORDER BY e.date DESC, e.id DESC LIMIT ?`
    )
    .all(vendorId, limit) as FeedEngagement[];
}

export type ExportContact = {
  name: string;
  role: string;
  title: string;
  email: string;
  phone: string;
  linkedin_url: string;
  status: string;
  partner_name: string;
  office_name: string | null;
};

export function listContactsForExport(options: {
  vendorId: number;
  partnerIds: number[];
  role: string;
  includeDeparted: boolean;
}): ExportContact[] {
  const params: Record<string, unknown> = { vendor: options.vendorId };
  const filters: string[] = [PERSON_IN_VENDOR];
  if (options.partnerIds.length > 0) {
    // Limit to the chosen partners, mapping each person to its partner in this vendor.
    const placeholders = options.partnerIds
      .map((_, i) => `@p${i}`)
      .join(",");
    filters.push(`${EFF_PARTNER_ID} IN (${placeholders})`);
    options.partnerIds.forEach((id, i) => {
      params[`p${i}`] = id;
    });
  }
  if (options.role && options.role !== "All") {
    filters.push("pe.role = @role");
    params.role = options.role;
  }
  if (!options.includeDeparted) {
    filters.push("pe.status = 'Active'");
  }
  return getDb()
    .prepare(
      `SELECT pe.name, pe.role, pe.title, pe.email, pe.phone, pe.linkedin_url, pe.status,
              (SELECT c.name FROM companies c WHERE c.id = pe.company_id) AS partner_name,
              o.name AS office_name
       FROM people pe
       LEFT JOIN offices o ON o.id = pe.office_id
       WHERE ${filters.join(" AND ")}
       ORDER BY partner_name COLLATE NOCASE, pe.name COLLATE NOCASE`
    )
    .all(params) as ExportContact[];
}

export type DealRow = Deal & { partner_name: string };

export function listDeals(vendorId: number): DealRow[] {
  return getDb()
    .prepare(
      `SELECT d.*, pa.name AS partner_name FROM deals d
       JOIN partners pa ON pa.id = d.partner_id
       WHERE pa.vendor_id = ?
       ORDER BY CASE WHEN d.stage IN ('Won','Lost') THEN 1 ELSE 0 END,
                d.registered_date DESC, d.id DESC`
    )
    .all(vendorId) as DealRow[];
}

export function listOpenDeals(vendorId: number): DealRow[] {
  return getDb()
    .prepare(
      `SELECT d.*, pa.name AS partner_name FROM deals d
       JOIN partners pa ON pa.id = d.partner_id
       WHERE pa.vendor_id = ? AND d.stage NOT IN ('Won','Lost')
       ORDER BY d.value DESC`
    )
    .all(vendorId) as DealRow[];
}

/** Partner names plus their active people, for the quick engagement logger. */
export type LogTarget = {
  id: number;
  name: string;
  people: { id: number; name: string; role: string }[];
};

export function listLogTargets(vendorId: number): LogTarget[] {
  const db = getDb();
  const partners = db
    .prepare(
      "SELECT id, name FROM partners WHERE vendor_id = ? ORDER BY name COLLATE NOCASE"
    )
    .all(vendorId) as { id: number; name: string }[];
  // Each active person mapped to the partner they belong to within this vendor.
  const people = db
    .prepare(
      `SELECT pe.id, ${EFF_PARTNER_ID} AS eff_partner_id, pe.name, pe.role
       FROM people pe
       WHERE pe.status = 'Active' AND ${PERSON_IN_VENDOR}
       ORDER BY pe.name COLLATE NOCASE`
    )
    .all({ vendor: vendorId }) as {
    id: number;
    eff_partner_id: number;
    name: string;
    role: string;
  }[];
  return partners.map((p) => ({
    ...p,
    people: people
      .filter((person) => person.eff_partner_id === p.id)
      .map(({ id, name, role }) => ({ id, name, role })),
  }));
}
