/**
 * Seeds the database with demo data so every dashboard panel has content.
 * Run with: npm run seed   (wipes existing data first)
 *
 * The data spans several vendors (tillverkare) to show off multi-brand
 * switching and shared personnel:
 *   - a populated Zscaler landscape;
 *   - an F5 landscape with Ted Nordvall's certifications;
 *   - Cygates, the same company partnered under BOTH F5 and Check Point, whose
 *     Sales/Management people are shared while technical staff are per-vendor.
 */
import { ensureVendorTiers, getDb, resolveCompanyId } from "../lib/db.ts";

const db = getDb();

const iso = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);

db.exec(`
  DELETE FROM problems; DELETE FROM needs; DELETE FROM competitors;
  DELETE FROM business_goals; DELETE FROM licenses; DELETE FROM mdf_entries;
  DELETE FROM deals; DELETE FROM engagement_partners; DELETE FROM engagement_attendees;
  DELETE FROM engagements; DELETE FROM certifications; DELETE FROM people;
  DELETE FROM offices; DELETE FROM partners; DELETE FROM tiers;
  DELETE FROM companies; DELETE FROM vendors;
`);

const addVendor = db.prepare(
  `INSERT INTO vendors (name, description, cert_catalog, status) VALUES (?, ?, ?, ?)`
);
function createVendor(name: string, description: string, certCatalog: string): number {
  const id = Number(
    addVendor.run(name, description, certCatalog, "Active").lastInsertRowid
  );
  ensureVendorTiers(db, id);
  return id;
}

const addPartnerStmt = db.prepare(
  `INSERT INTO partners (vendor_id, company_id, name, tier, status, website, region, annual_revenue, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
function mkPartner(
  vendorId: number,
  name: string,
  tier: string,
  status: string,
  website: string,
  region: string,
  revenue: number,
  notes: string
): number {
  return Number(
    addPartnerStmt.run(
      vendorId, resolveCompanyId(db, name), name, tier, status, website, region, revenue, notes
    ).lastInsertRowid
  );
}

const addOffice = db.prepare(
  `INSERT INTO offices (partner_id, name, region, address) VALUES (?, ?, ?, ?)`
);
const setOffice = db.prepare(`UPDATE people SET office_id = ? WHERE id = ?`);

const COMPANY_WIDE_ROLES = ["Sales", "Management"];
const addPersonStmt = db.prepare(
  `INSERT INTO people (partner_id, company_id, company_wide, office_id, name, role, title, email, phone, linkedin_url, status, departed_at, departed_to, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
function mkPerson(
  partnerId: number,
  name: string,
  role: string,
  title: string,
  email = "",
  phone = "",
  linkedin = "",
  status = "Active",
  departedAt = "",
  departedTo = "",
  notes = ""
): number {
  const { company_id } = db
    .prepare("SELECT company_id FROM partners WHERE id = ?")
    .get(partnerId) as { company_id: number };
  const cw = COMPANY_WIDE_ROLES.includes(role) ? 1 : 0;
  return Number(
    addPersonStmt.run(
      partnerId, company_id, cw, null, name, role, title,
      email, phone, linkedin, status, departedAt, departedTo, notes
    ).lastInsertRowid
  );
}

const addCertStmt = db.prepare(
  `INSERT INTO certifications (person_id, vendor_id, name, level, issued_date, expiry_date)
   VALUES (?, ?, ?, ?, ?, ?)`
);
function mkCert(
  personId: number,
  vendorId: number,
  name: string,
  level: string,
  issued: string,
  expiry: string
) {
  addCertStmt.run(personId, vendorId, name, level, issued, expiry);
}

const addEngagementStmt = db.prepare(
  `INSERT INTO engagements (partner_id, type, date, summary, topics, details) VALUES (?, ?, ?, ?, ?, ?)`
);
const addAttendee = db.prepare(
  `INSERT INTO engagement_attendees (engagement_id, person_id) VALUES (?, ?)`
);
const addEngagementPartner = db.prepare(
  `INSERT INTO engagement_partners (engagement_id, partner_id) VALUES (?, ?)`
);
function addEngagement(
  partnerIds: number | number[],
  attendees: number[],
  type: string,
  date: string,
  summary: string,
  topics = "",
  details = ""
) {
  const ids = Array.isArray(partnerIds) ? partnerIds : [partnerIds];
  const id = Number(
    addEngagementStmt.run(ids[0], type, date, summary, topics, details).lastInsertRowid
  );
  for (const pid of ids) addEngagementPartner.run(id, pid);
  for (const personId of attendees) addAttendee.run(id, personId);
}
const addDeal = db.prepare(
  `INSERT INTO deals (partner_id, customer, title, value, stage, support_provided, registered_date, closed_date, salesforce_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const addMdf = db.prepare(
  `INSERT INTO mdf_entries (partner_id, entry_date, kind, amount, description) VALUES (?, ?, ?, ?, ?)`
);
const addLicense = db.prepare(
  `INSERT INTO licenses (partner_id, product, kind, identifier, issued_date, expiry_date, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const addGoal = db.prepare(
  `INSERT INTO business_goals (partner_id, year, title, target, progress_pct, notes) VALUES (?, ?, ?, ?, ?, ?)`
);
const addCompetitor = db.prepare(
  `INSERT INTO competitors (partner_id, vendor, notes) VALUES (?, ?, ?)`
);
const addNeed = db.prepare(
  `INSERT INTO needs (partner_id, title, description, priority, status) VALUES (?, ?, ?, ?, ?)`
);
const addProblem = db.prepare(
  `INSERT INTO problems (partner_id, title, description, severity, status) VALUES (?, ?, ?, ?, ?)`
);

// =====================================================================
// Vendor 1 — Zscaler (the populated SSE partner landscape)
// =====================================================================
const zscaler = createVendor(
  "Zscaler",
  "Security Service Edge — ZIA / ZPA / ZDX",
  "ZIA, ZPA, ZDX, Sales Foundation, SSE Delivery"
);

// --- Northwind Secure (Gold, healthy but a cert is expiring soon) ---
const northwind = mkPartner(zscaler, "Northwind Secure", "Gold", "Active",
  "https://northwindsecure.example", "Nordics", 750000,
  "Largest partner in the region, strong technical bench.");
const nwStockholm = Number(
  addOffice.run(northwind, "Stockholm HQ", "Sweden", "Vasagatan 12, Stockholm").lastInsertRowid
);
const nwMalmo = Number(
  addOffice.run(northwind, "Malmö office", "Sweden South", "Stortorget 3, Malmö").lastInsertRowid
);
const anna = mkPerson(northwind, "Anna Larsson", "Technical", "Lead Security Engineer",
  "anna@northwindsecure.example", "+46 70 123 4567",
  "https://linkedin.com/in/anna-larsson-example");
const bjorn = mkPerson(northwind, "Björn Eriksson", "Sales", "Account Director",
  "bjorn@northwindsecure.example", "+46 70 234 5678",
  "https://linkedin.com/in/bjorn-eriksson-example");
const cecilia = mkPerson(northwind, "Cecilia Nyström", "Technical", "Solutions Architect",
  "cecilia@northwindsecure.example");
mkPerson(northwind, "David Holm", "Technical", "Senior Engineer", "", "",
  "https://linkedin.com/in/david-holm-example", "Departed", iso(-21),
  "Cloudbreak Consulting", "Took two cert holders' knowledge with him.");
setOffice.run(nwStockholm, anna);
setOffice.run(nwMalmo, cecilia);
mkCert(anna, zscaler, "ZIA", "Professional", iso(-305), iso(60));
mkCert(anna, zscaler, "ZPA", "Professional", iso(-200), iso(165));
mkCert(bjorn, zscaler, "Sales Foundation", "Associate", iso(-100), iso(265));
mkCert(cecilia, zscaler, "ZIA", "Associate", iso(-50), iso(315));
mkCert(cecilia, zscaler, "ZDX", "Professional", iso(-400), iso(-35));
addEngagement(northwind, [bjorn, anna], "QBR", iso(-15),
  "Q2 QBR — pipeline up 20%, agreed on joint event in September.",
  "Pipeline, MDF/Marketing", "They want co-funding for a September roadshow; follow up with budget.");
addEngagement(northwind, [anna, cecilia], "Enablement session", iso(-40),
  "ZDX hands-on workshop for the technical team.", "Enablement, Certifications");
addEngagement(northwind, [bjorn], "Lunch/Dinner", iso(-5),
  "Lunch with Björn — relationship check-in.", "Relationship, Deal support",
  "He hinted at a large retail opportunity landing in Q3.");
addMdf.run(northwind, iso(-120), "Allocation", 25000, "FY26 H1 MDF allocation");
addMdf.run(northwind, iso(-60), "Usage", 9000, "Stockholm security breakfast event");
addMdf.run(northwind, iso(-20), "Usage", 4500, "LinkedIn campaign co-funding");
addLicense.run(northwind, "ZIA NFR tenant", "NFR", "NW-ZIA-001", iso(-300), iso(65), "Used for customer demos");
addLicense.run(northwind, "Lab rack — branch connector", "Demo hardware", "HW-4471", iso(-500), "", "In their Malmö lab");
addGoal.run(northwind, 2026, "Land 10 new logos", "10 logos", 60, "6 closed as of June");
addGoal.run(northwind, 2026, "Grow services revenue", "$250k attach", 35, "");
addCompetitor.run(northwind, "Cloudflare", "Pitches Cloudflare One when price pressure is high");
addNeed.run(northwind, "ZDX recertification for Cecilia", "Her ZDX cert expired — book the exam.", "High", "Open");
addProblem.run(northwind, "Backfill for departed engineer", "David's departure leaves a demo-delivery gap.", "Medium", "Open");

// --- Apex Networks (Silver, tier at risk: too few active certs) ---
const apex = mkPartner(zscaler, "Apex Networks", "Silver", "Active",
  "https://apexnetworks.example", "DACH", 140000, "Ambitious, wants Gold next year.");
const markus = mkPerson(apex, "Markus Weber", "Technical", "Network Engineer",
  "markus@apexnetworks.example", "", "https://linkedin.com/in/markus-weber-example");
const julia = mkPerson(apex, "Julia Brandt", "Sales", "Partner Manager",
  "julia@apexnetworks.example", "+49 151 1234567");
mkPerson(apex, "Stefan Koch", "Technical", "Security Consultant", "", "",
  "https://linkedin.com/in/stefan-koch-example", "Departed", iso(-45),
  "Trireme Security GmbH", "Held their second ZIA cert — Silver now at risk.");
mkCert(markus, zscaler, "ZIA", "Professional", iso(-150), iso(25));
mkCert(julia, zscaler, "Sales Foundation", "Associate", iso(-90), iso(275));
addEngagement(apex, [julia], "Call", iso(-10),
  "Discussed Gold requirements and cert plan for H2.", "Certifications, Pipeline");
addEngagement(apex, [markus, julia], "Visit", iso(-30),
  "On-site visit in Munich, demo lab walkthrough.", "Enablement, Roadmap");
addMdf.run(apex, iso(-90), "Allocation", 10000, "FY26 MDF allocation");
addLicense.run(apex, "ZPA NFR tenant", "NFR", "APX-ZPA-007", iso(-200), iso(40), "");
addGoal.run(apex, 2026, "Reach Gold tier", "6 active certs / $500k", 25, "Needs 4 more certified people");
addCompetitor.run(apex, "Netskope", "Legacy Netskope practice from an acquisition");
addNeed.run(apex, "Two engineers through ZIA training", "Required to keep Silver after Stefan left.", "High", "In progress");
addProblem.run(apex, "Cert coverage below Silver requirement", "Only 2 active certs, 3 required.", "High", "Open");

// --- Meridian IT (Authorized, gone quiet) ---
const meridian = mkPartner(zscaler, "Meridian IT", "Authorized", "Active",
  "https://meridianit.example", "Benelux", 30000, "Transactional partner, little engagement lately.");
const piet = mkPerson(meridian, "Piet Janssen", "Sales", "Owner", "piet@meridianit.example");
mkCert(piet, zscaler, "Sales Foundation", "Associate", iso(-400), iso(-30));
addEngagement(meridian, [piet], "Email", iso(-95), "Sent renewal reminder, no reply.", "Relationship");
addNeed.run(meridian, "Re-engagement plan", "No touchpoint in three months.", "Medium", "Open");
addProblem.run(meridian, "Unresponsive to outreach", "Risk of partner churn.", "Critical", "Open");
addCompetitor.run(meridian, "Zscaler", "Also resells us via a distributor — and pitches Palo Alto");

addEngagement([northwind, apex, meridian], [anna, cecilia, markus, piet],
  "Enablement session", iso(-3),
  "Regional partner training day — SSE deep dive for three partners.",
  "Enablement, Certifications, Roadmap",
  "Strong turnout; Apex asked for a follow-up cert bootcamp in Q3.");

addDeal.run(northwind, "ScandiRetail AB", "SSE rollout, 1200 users", 180000,
  "In progress", "Joint demo + PoC support", iso(-25), "", "006Aa0000012AbCdEF");
addDeal.run(northwind, "Fjord Logistics", "ZPA for contractors", 60000,
  "Won", "Pricing approval, architecture review", iso(-120), iso(-10), "");
addDeal.run(apex, "Bayern Manufacturing", "Zero trust pilot", 45000,
  "Registered", "Requested SE support for PoC", iso(-7), "", "");

// =====================================================================
// Vendor 2 — F5 (Ted Nordvall's certified landscape)
// =====================================================================
const f5 = createVendor(
  "F5",
  "Application security & delivery (BIG-IP, NGINX, Distributed Cloud)",
  "201, 202, 301, 302, 303, 304, 401, 402, XC Accreditation"
);

const nordvall = mkPartner(f5, "Nordvall Consulting", "Gold", "Active",
  "https://se.linkedin.com/in/ted-nordvall", "Nordics", 600000,
  "F5 certified consultancy — deep ADC and security expertise.");
const ted = mkPerson(nordvall, "Ted Nordvall", "Technical", "F5 Certified Consultant",
  "d3vilb0y92@gmail.com", "", "https://se.linkedin.com/in/ted-nordvall", "Active", "", "",
  "Founder. F5 Certified across the 201–402 track plus XC accreditations.");
mkCert(ted, f5, "201 — TMOS Administration", "Associate", iso(-540), iso(190));
mkCert(ted, f5, "202 — Pre-Sales Fundamentals", "Associate", iso(-540), iso(190));
mkCert(ted, f5, "301 — LTM Specialist", "Professional", iso(-430), iso(300));
mkCert(ted, f5, "302 — DNS Specialist", "Professional", iso(-430), iso(300));
mkCert(ted, f5, "303 — ASM Specialist", "Professional", iso(-300), iso(430));
mkCert(ted, f5, "304 — APM Specialist", "Professional", iso(-200), iso(530));
mkCert(ted, f5, "401 — Security Solution Expert", "Expert", iso(-120), iso(610));
mkCert(ted, f5, "402 — Cloud Solution Expert", "Expert", iso(-300), iso(55));
mkCert(ted, f5, "XC Accreditation — Distributed Cloud", "Accreditation", iso(-90), iso(640));
addEngagement(nordvall, [ted], "QBR", iso(-12),
  "Reviewed F5 Distributed Cloud opportunities and recert schedule.",
  "Pipeline, Certifications, Roadmap", "402 recert due in ~2 months — book the exam.");
addGoal.run(nordvall, 2026, "Maintain Gold + full cert coverage", "All 201–402 current", 80, "402 recert outstanding");
addNeed.run(nordvall, "Renew F5 402 (Cloud Solution Expert)", "Expires in ~2 months.", "High", "Open");
addLicense.run(nordvall, "BIG-IP VE lab", "Lab", "F5-VE-LAB-01", iso(-365), iso(120), "Distributed Cloud + BIG-IP demo lab");

// =====================================================================
// Vendor 3 — Check Point (network security)
// =====================================================================
const checkpoint = createVendor(
  "Check Point",
  "Network security & firewalls",
  "CCSA, CCSE, CCSM, CCTE"
);

// --- Cygates: the SAME company, partnered under both F5 and Check Point. ---
// Sales/Management entered once below show up under both vendors automatically;
// each vendor's technical staff and certs are kept separate.
const cygatesF5 = mkPartner(f5, "Cygates", "Gold", "Active",
  "https://cygates.example", "Nordics", 900000, "Large Nordic SI — multi-vendor practice.");
const cygatesCp = mkPartner(checkpoint, "Cygates", "Silver", "Active",
  "https://cygates.example", "Nordics", 300000, "Same SI, growing its Check Point business.");

// Shared company-wide contacts (added once, under the F5 relationship):
const lena = mkPerson(cygatesF5, "Lena Svensson", "Sales", "Key Account Manager",
  "lena@cygates.example", "+46 70 555 1212", "https://linkedin.com/in/lena-svensson-example");
mkPerson(cygatesF5, "Olof Berg", "Management", "Practice Lead",
  "olof@cygates.example", "+46 70 555 3434");
mkCert(lena, f5, "Sales Professional — Security", "Associate", iso(-120), iso(245));

// Technical staff are per vendor — same engineer can work both, but is added
// (and certified) separately for each.
const svenF5 = mkPerson(cygatesF5, "Sven Holm", "Technical", "Senior ADC Engineer",
  "sven@cygates.example", "", "https://linkedin.com/in/sven-holm-example");
mkCert(svenF5, f5, "301 — LTM Specialist", "Professional", iso(-200), iso(420));
mkCert(svenF5, f5, "303 — ASM Specialist", "Professional", iso(-150), iso(70));
const svenCp = mkPerson(cygatesCp, "Sven Holm", "Technical", "Senior Firewall Engineer",
  "sven@cygates.example", "", "https://linkedin.com/in/sven-holm-example");
mkCert(svenCp, checkpoint, "CCSE", "Professional", iso(-90), iso(280));

addEngagement(cygatesF5, [lena, svenF5], "QBR", iso(-8),
  "Cygates joint QBR — F5 Distributed Cloud roadmap and pipeline.",
  "Pipeline, Roadmap, Certifications");
addEngagement(cygatesCp, [lena], "Call", iso(-18),
  "Kicked off Cygates' Check Point ramp — needs a second CCSE.",
  "Enablement, Certifications");
addGoal.run(cygatesF5, 2026, "Grow F5 Distributed Cloud revenue", "$1.2M", 55, "");
addNeed.run(cygatesCp, "Second engineer to CCSE", "One CCSE today — Silver needs three active certs.", "High", "In progress");
addProblem.run(cygatesCp, "Check Point cert coverage below Silver", "Only 1 active cert, 3 required.", "High", "Open");
addDeal.run(cygatesF5, "Nordbank", "WAF + Distributed Cloud", 220000,
  "In progress", "Architecture workshop", iso(-14), "", "");

console.log(
  "Seeded demo data: 3 vendors (Zscaler, F5, Check Point), 6 partners across 5 companies " +
    "(Cygates spans F5 + Check Point), shared Sales/Management, per-vendor technical staff and certs."
);
