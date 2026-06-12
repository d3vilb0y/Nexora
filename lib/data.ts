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
  Engagement,
  License,
  MdfEntry,
  Need,
  Partner,
  Person,
  Problem,
  Tier,
} from "./types";

const TODAY = () => new Date().toISOString().slice(0, 10);

export function listTiers(): Tier[] {
  return getDb()
    .prepare("SELECT * FROM tiers ORDER BY rank")
    .all() as Tier[];
}

/** Count certs that still count toward tier requirements: held by active people and not expired. */
function activeCertCountFor(partnerId: number): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c
       FROM certifications c
       JOIN people p ON p.id = c.person_id
       WHERE p.partner_id = ? AND p.status = 'Active'
         AND (c.expiry_date = '' OR c.expiry_date >= ?)`
    )
    .get(partnerId, TODAY()) as { c: number };
  return row.c;
}

function lastEngagementFor(partnerId: number): string | null {
  const row = getDb()
    .prepare(
      "SELECT MAX(date) AS d FROM engagements WHERE partner_id = ?"
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
  const activeCertCount = activeCertCountFor(partner.id);
  const lastEngagement = lastEngagementFor(partner.id);
  const openProblems = openProblemsFor(partner.id);
  const peopleCount = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM people WHERE partner_id = ? AND status = 'Active'"
      )
      .get(partner.id) as { c: number }
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

export function listPartners(): PartnerSummary[] {
  const tiers = listTiers();
  const partners = getDb()
    .prepare("SELECT * FROM partners ORDER BY name COLLATE NOCASE")
    .all() as Partner[];
  return partners.map((p) => summarize(p, tiers));
}

export type PersonWithCerts = Person & { certifications: Certification[] };

export type PartnerDetail = {
  partner: PartnerSummary;
  people: PersonWithCerts[];
  engagements: (Engagement & { person_name: string | null })[];
  mdfEntries: MdfEntry[];
  mdfBalance: number;
  licenses: License[];
  goals: BusinessGoal[];
  competitors: Competitor[];
  needs: Need[];
  problems: Problem[];
  tiers: Tier[];
};

export function getPartnerDetail(id: number): PartnerDetail | null {
  const db = getDb();
  const partner = db
    .prepare("SELECT * FROM partners WHERE id = ?")
    .get(id) as Partner | undefined;
  if (!partner) return null;
  const tiers = listTiers();

  const people = db
    .prepare(
      "SELECT * FROM people WHERE partner_id = ? ORDER BY status, name COLLATE NOCASE"
    )
    .all(id) as Person[];
  const certsByPerson = db
    .prepare(
      `SELECT c.* FROM certifications c
       JOIN people p ON p.id = c.person_id
       WHERE p.partner_id = ?
       ORDER BY c.expiry_date`
    )
    .all(id) as Certification[];

  const engagements = db
    .prepare(
      `SELECT e.*, p.name AS person_name FROM engagements e
       LEFT JOIN people p ON p.id = e.person_id
       WHERE e.partner_id = ? ORDER BY e.date DESC`
    )
    .all(id) as (Engagement & { person_name: string | null })[];

  const mdfEntries = db
    .prepare(
      "SELECT * FROM mdf_entries WHERE partner_id = ? ORDER BY entry_date DESC"
    )
    .all(id) as MdfEntry[];
  const mdfBalance = mdfEntries.reduce(
    (sum, e) => sum + (e.kind === "Allocation" ? e.amount : -e.amount),
    0
  );

  return {
    partner: summarize(partner, tiers),
    people: people.map((person) => ({
      ...person,
      certifications: certsByPerson.filter((c) => c.person_id === person.id),
    })),
    engagements,
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
  partner_name: string;
  cert_count: number;
  last_touch: string | null;
};

export function listPeople(): PersonDirectoryRow[] {
  return getDb()
    .prepare(
      `SELECT p.*, pa.name AS partner_name,
        (SELECT COUNT(*) FROM certifications c WHERE c.person_id = p.id) AS cert_count,
        (SELECT MAX(e.date) FROM engagements e WHERE e.person_id = p.id) AS last_touch
       FROM people p
       JOIN partners pa ON pa.id = p.partner_id
       ORDER BY p.status, p.name COLLATE NOCASE`
    )
    .all() as PersonDirectoryRow[];
}

export type CertRow = Certification & {
  person_name: string;
  person_status: string;
  partner_id: number;
  partner_name: string;
};

export function listCertifications(): CertRow[] {
  return getDb()
    .prepare(
      `SELECT c.*, p.name AS person_name, p.status AS person_status,
              pa.id AS partner_id, pa.name AS partner_name
       FROM certifications c
       JOIN people p ON p.id = c.person_id
       JOIN partners pa ON pa.id = p.partner_id
       ORDER BY CASE WHEN c.expiry_date = '' THEN 1 ELSE 0 END, c.expiry_date`
    )
    .all() as CertRow[];
}

export type DashboardData = {
  partners: PartnerSummary[];
  expiringCerts: (CertRow & { days: number })[];
  expiringLicenses: (License & { partner_name: string; days: number })[];
  quietPartners: PartnerSummary[];
  tierAtRisk: PartnerSummary[];
  recentDepartures: (Person & { partner_name: string })[];
  hotProblems: (Problem & { partner_name: string })[];
};

export function getDashboard(): DashboardData {
  const db = getDb();
  const partners = listPartners();

  const expiringCerts = listCertifications()
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
         WHERE l.expiry_date != '' ORDER BY l.expiry_date`
      )
      .all() as (License & { partner_name: string })[]
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
      `SELECT p.*, pa.name AS partner_name FROM people p
       JOIN partners pa ON pa.id = p.partner_id
       WHERE p.status = 'Departed' AND p.departed_at >= ?
       ORDER BY p.departed_at DESC`
    )
    .all(cutoff) as (Person & { partner_name: string })[];

  const hotProblems = db
    .prepare(
      `SELECT pr.*, pa.name AS partner_name FROM problems pr
       JOIN partners pa ON pa.id = pr.partner_id
       WHERE pr.status != 'Resolved' AND pr.severity IN ('High','Critical')
       ORDER BY CASE pr.severity WHEN 'Critical' THEN 0 ELSE 1 END, pr.created_at DESC`
    )
    .all() as (Problem & { partner_name: string })[];

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
