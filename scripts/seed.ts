/**
 * Seeds the database with demo data so every dashboard panel has content.
 * Run with: npm run seed   (wipes existing data first)
 */
import { getDb } from "../lib/db.ts";

const db = getDb();

const iso = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);

db.exec(`
  DELETE FROM problems; DELETE FROM needs; DELETE FROM competitors;
  DELETE FROM business_goals; DELETE FROM licenses; DELETE FROM mdf_entries;
  DELETE FROM deals; DELETE FROM engagement_attendees; DELETE FROM engagements;
  DELETE FROM certifications; DELETE FROM people; DELETE FROM partners;
`);

const addPartner = db.prepare(
  `INSERT INTO partners (name, tier, status, website, region, annual_revenue, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const addPerson = db.prepare(
  `INSERT INTO people (partner_id, name, role, title, email, phone, linkedin_url, status, departed_at, departed_to, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const addCert = db.prepare(
  `INSERT INTO certifications (person_id, name, level, issued_date, expiry_date)
   VALUES (?, ?, ?, ?, ?)`
);
const addEngagementStmt = db.prepare(
  `INSERT INTO engagements (partner_id, type, date, summary, topics, details) VALUES (?, ?, ?, ?, ?, ?)`
);
const addAttendee = db.prepare(
  `INSERT INTO engagement_attendees (engagement_id, person_id) VALUES (?, ?)`
);
function addEngagement(
  partnerId: number,
  attendees: number[],
  type: string,
  date: string,
  summary: string,
  topics = "",
  details = ""
) {
  const id = Number(
    addEngagementStmt.run(partnerId, type, date, summary, topics, details)
      .lastInsertRowid
  );
  for (const personId of attendees) addAttendee.run(id, personId);
}
const addDeal = db.prepare(
  `INSERT INTO deals (partner_id, customer, title, value, stage, support_provided, registered_date, closed_date)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
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

// --- Northwind Secure (Gold, healthy but a cert is expiring soon) ---
const northwind = Number(
  addPartner.run(
    "Northwind Secure",
    "Gold",
    "Active",
    "https://northwindsecure.example",
    "Nordics",
    750000,
    "Largest partner in the region, strong technical bench."
  ).lastInsertRowid
);
const anna = Number(
  addPerson.run(northwind, "Anna Larsson", "Technical", "Lead Security Engineer",
    "anna@northwindsecure.example", "+46 70 123 4567",
    "https://linkedin.com/in/anna-larsson-example", "Active", "", "", ""
  ).lastInsertRowid
);
const bjorn = Number(
  addPerson.run(northwind, "Björn Eriksson", "Sales", "Account Director",
    "bjorn@northwindsecure.example", "+46 70 234 5678",
    "https://linkedin.com/in/bjorn-eriksson-example", "Active", "", "", ""
  ).lastInsertRowid
);
const cecilia = Number(
  addPerson.run(northwind, "Cecilia Nyström", "Technical", "Solutions Architect",
    "cecilia@northwindsecure.example", "", "", "Active", "", "", ""
  ).lastInsertRowid
);
addPerson.run(northwind, "David Holm", "Technical", "Senior Engineer",
  "", "", "https://linkedin.com/in/david-holm-example",
  "Departed", iso(-21), "Cloudbreak Consulting", "Took two cert holders' knowledge with him."
);
addCert.run(anna, "ZIA", "Professional", iso(-305), iso(60));
addCert.run(anna, "ZPA", "Professional", iso(-200), iso(165));
addCert.run(bjorn, "Sales Foundation", "Associate", iso(-100), iso(265));
addCert.run(cecilia, "ZIA", "Associate", iso(-50), iso(315));
addCert.run(cecilia, "ZDX", "Professional", iso(-400), iso(-35));
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
const apex = Number(
  addPartner.run(
    "Apex Networks", "Silver", "Active", "https://apexnetworks.example",
    "DACH", 140000, "Ambitious, wants Gold next year."
  ).lastInsertRowid
);
const markus = Number(
  addPerson.run(apex, "Markus Weber", "Technical", "Network Engineer",
    "markus@apexnetworks.example", "", "https://linkedin.com/in/markus-weber-example",
    "Active", "", "", ""
  ).lastInsertRowid
);
const julia = Number(
  addPerson.run(apex, "Julia Brandt", "Sales", "Partner Manager",
    "julia@apexnetworks.example", "+49 151 1234567", "", "Active", "", "", ""
  ).lastInsertRowid
);
addPerson.run(apex, "Stefan Koch", "Technical", "Security Consultant",
  "", "", "https://linkedin.com/in/stefan-koch-example",
  "Departed", iso(-45), "Trireme Security GmbH", "Held their second ZIA cert — Silver now at risk."
);
addCert.run(markus, "ZIA", "Professional", iso(-150), iso(25));
addCert.run(julia, "Sales Foundation", "Associate", iso(-90), iso(275));
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
const meridian = Number(
  addPartner.run(
    "Meridian IT", "Authorized", "Active", "https://meridianit.example",
    "Benelux", 30000, "Transactional partner, little engagement lately."
  ).lastInsertRowid
);
const piet = Number(
  addPerson.run(meridian, "Piet Janssen", "Sales", "Owner",
    "piet@meridianit.example", "", "", "Active", "", "", ""
  ).lastInsertRowid
);
addCert.run(piet, "Sales Foundation", "Associate", iso(-400), iso(-30));
addEngagement(meridian, [piet], "Email", iso(-95), "Sent renewal reminder, no reply.", "Relationship");
addNeed.run(meridian, "Re-engagement plan", "No touchpoint in three months.", "Medium", "Open");
addProblem.run(meridian, "Unresponsive to outreach", "Risk of partner churn.", "Critical", "Open");
addCompetitor.run(meridian, "Zscaler", "Also resells us via a distributor — and pitches Palo Alto");

// Deals partners brought us into
addDeal.run(northwind, "ScandiRetail AB", "SSE rollout, 1200 users", 180000,
  "In progress", "Joint demo + PoC support", iso(-25), "");
addDeal.run(northwind, "Fjord Logistics", "ZPA for contractors", 60000,
  "Won", "Pricing approval, architecture review", iso(-120), iso(-10));
addDeal.run(apex, "Bayern Manufacturing", "Zero trust pilot", 45000,
  "Registered", "Requested SE support for PoC", iso(-7), "");

console.log("Seeded demo data: 3 partners, 8 people, certs, engagements, deals, MDF, licenses, goals.");
