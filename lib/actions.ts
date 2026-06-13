"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureVendorTiers, getDb, resolveCompanyId } from "./db";
import { getActiveVendorId, VENDOR_COOKIE } from "./vendor";
import { COMPANY_WIDE_ROLES } from "./types";
import {
  fetchSalesforceDeals,
  importDeals,
  parseSalesforceCsv,
  type ImportSummary,
} from "./deal-import";

function str(form: FormData, key: string): string {
  return (form.get(key) as string | null)?.trim() ?? "";
}

function num(form: FormData, key: string): number {
  const v = Number(form.get(key));
  return Number.isFinite(v) ? v : 0;
}

function reqStr(form: FormData, key: string): string {
  const v = str(form, key);
  if (!v) throw new Error(`Missing required field: ${key}`);
  return v;
}

function revalidatePartner(partnerId: number | string) {
  revalidatePath("/");
  revalidatePath("/partners");
  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/people");
  revalidatePath("/certifications");
  revalidatePath("/log");
  revalidatePath("/deals");
}

// --- Vendors (tillverkare) ---

/** Switch which vendor's partner landscape the whole CRM is scoped to. */
export async function setActiveVendor(form: FormData) {
  const id = num(form, "vendor_id");
  (await cookies()).set(VENDOR_COOKIE, String(id), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function createVendor(form: FormData) {
  const db = getDb();
  const id = Number(
    db
      .prepare(
        "INSERT INTO vendors (name, description, cert_catalog, status) VALUES (?, ?, ?, ?)"
      )
      .run(
        reqStr(form, "name"),
        str(form, "description"),
        str(form, "cert_catalog"),
        str(form, "status") || "Active"
      ).lastInsertRowid
  );
  // Give the new vendor a usable program tier ladder out of the box.
  ensureVendorTiers(db, id);
  // Focus the freshly created vendor right away.
  (await cookies()).set(VENDOR_COOKIE, String(id), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function updateVendor(form: FormData) {
  getDb()
    .prepare(
      "UPDATE vendors SET name = ?, description = ?, cert_catalog = ?, status = ? WHERE id = ?"
    )
    .run(
      reqStr(form, "name"),
      str(form, "description"),
      str(form, "cert_catalog"),
      str(form, "status") || "Active",
      num(form, "id")
    );
  revalidatePath("/", "layout");
  revalidatePath("/admin");
}

export async function deleteVendor(form: FormData) {
  const db = getDb();
  const id = num(form, "id");
  const total = (
    db.prepare("SELECT COUNT(*) AS c FROM vendors").get() as { c: number }
  ).c;
  if (total <= 1) {
    redirect("/admin?error=" + encodeURIComponent("Can't delete the last vendor — the CRM needs at least one."));
  }
  // Cascades to the vendor's partners and everything hanging off them.
  db.prepare("DELETE FROM vendors WHERE id = ?").run(id);
  // If the deleted vendor was in focus, fall back to whatever remains.
  const store = await cookies();
  if (store.get(VENDOR_COOKIE)?.value === String(id)) {
    store.delete(VENDOR_COOKIE);
  }
  revalidatePath("/", "layout");
  redirect("/admin");
}

// --- Partners ---

export async function createPartner(form: FormData) {
  const vendorId = await getActiveVendorId();
  const db = getDb();
  const name = reqStr(form, "name");
  // Same company name (in any vendor) → same company, so its Sales/Management
  // people follow it into this vendor automatically.
  const companyId = resolveCompanyId(db, name);
  const result = db
    .prepare(
      `INSERT INTO partners (vendor_id, company_id, name, tier, status, website, region, annual_revenue, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      vendorId,
      companyId,
      name,
      str(form, "tier") || "Authorized",
      str(form, "status") || "Active",
      str(form, "website"),
      str(form, "region"),
      num(form, "annual_revenue"),
      str(form, "notes")
    );
  revalidatePartner(Number(result.lastInsertRowid));
  redirect(`/partners/${result.lastInsertRowid}`);
}

export async function updatePartner(form: FormData) {
  const id = num(form, "id");
  getDb()
    .prepare(
      `UPDATE partners SET name = ?, tier = ?, status = ?, website = ?, region = ?,
       annual_revenue = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(
      reqStr(form, "name"),
      str(form, "tier"),
      str(form, "status"),
      str(form, "website"),
      str(form, "region"),
      num(form, "annual_revenue"),
      str(form, "notes"),
      id
    );
  revalidatePartner(id);
}

export async function deletePartner(form: FormData) {
  const db = getDb();
  const id = num(form, "id");
  const partner = db
    .prepare("SELECT company_id FROM partners WHERE id = ?")
    .get(id) as { company_id: number } | undefined;
  // Company-wide people homed at this partner must survive if the company is
  // still engaged with other vendors — re-home them to a sibling partner.
  if (partner) {
    const sibling = db
      .prepare(
        "SELECT id FROM partners WHERE company_id = ? AND id != ? LIMIT 1"
      )
      .get(partner.company_id, id) as { id: number } | undefined;
    if (sibling) {
      db.prepare(
        "UPDATE people SET partner_id = ? WHERE partner_id = ? AND company_wide = 1"
      ).run(sibling.id, id);
    }
  }
  db.prepare("DELETE FROM partners WHERE id = ?").run(id);
  revalidatePartner(id);
  redirect("/partners");
}

// --- Offices ---

export async function createOffice(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb()
    .prepare(
      `INSERT INTO offices (partner_id, name, region, address, phone, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      partnerId,
      reqStr(form, "name"),
      str(form, "region"),
      str(form, "address"),
      str(form, "phone"),
      str(form, "notes")
    );
  revalidatePartner(partnerId);
}

export async function deleteOffice(form: FormData) {
  getDb().prepare("DELETE FROM offices WHERE id = ?").run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- People ---

export async function createPerson(form: FormData) {
  const db = getDb();
  const partnerId = num(form, "partner_id");
  const officeId = num(form, "office_id");
  const role = str(form, "role") || "Sales";
  // Sales/Management belong to the whole company (visible under every vendor it
  // works with); Technical/Other are anchored to this one vendor relationship.
  const companyWide = COMPANY_WIDE_ROLES.includes(role) ? 1 : 0;
  const partner = db
    .prepare("SELECT company_id FROM partners WHERE id = ?")
    .get(partnerId) as { company_id: number } | undefined;
  db
    .prepare(
      `INSERT INTO people (partner_id, company_id, company_wide, office_id, name, role, title, email, phone, linkedin_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      partnerId,
      partner?.company_id ?? null,
      companyWide,
      // A company-wide person isn't tied to one vendor's office.
      !companyWide && officeId > 0 ? officeId : null,
      reqStr(form, "name"),
      role,
      str(form, "title"),
      str(form, "email"),
      str(form, "phone"),
      str(form, "linkedin_url"),
      str(form, "notes")
    );
  revalidatePartner(partnerId);
}

export async function setPersonOffice(form: FormData) {
  const officeId = num(form, "office_id");
  getDb()
    .prepare("UPDATE people SET office_id = ? WHERE id = ?")
    .run(officeId > 0 ? officeId : null, num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

export async function markPersonDeparted(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb()
    .prepare(
      `UPDATE people SET status = 'Departed', departed_at = ?, departed_to = ? WHERE id = ?`
    )
    .run(
      str(form, "departed_at") || new Date().toISOString().slice(0, 10),
      str(form, "departed_to"),
      num(form, "id")
    );
  revalidatePartner(partnerId);
}

export async function reactivatePerson(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb()
    .prepare(
      "UPDATE people SET status = 'Active', departed_at = '', departed_to = '' WHERE id = ?"
    )
    .run(num(form, "id"));
  revalidatePartner(partnerId);
}

export async function deletePerson(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb().prepare("DELETE FROM people WHERE id = ?").run(num(form, "id"));
  revalidatePartner(partnerId);
}

// --- Certifications ---

export async function createCertification(form: FormData) {
  const db = getDb();
  const partnerId = num(form, "partner_id");
  // The cert belongs to the program of whichever vendor we're adding it under,
  // so a shared person can hold (e.g.) F5 and Check Point certs side by side.
  const partner = db
    .prepare("SELECT vendor_id FROM partners WHERE id = ?")
    .get(partnerId) as { vendor_id: number } | undefined;
  db
    .prepare(
      `INSERT INTO certifications (person_id, vendor_id, name, level, issued_date, expiry_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      num(form, "person_id"),
      partner?.vendor_id ?? null,
      reqStr(form, "name"),
      str(form, "level"),
      str(form, "issued_date"),
      str(form, "expiry_date"),
      str(form, "notes")
    );
  revalidatePartner(partnerId);
}

export async function deleteCertification(form: FormData) {
  getDb()
    .prepare("DELETE FROM certifications WHERE id = ?")
    .run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- Engagements ---

export async function createEngagement(form: FormData) {
  const partnerIds = form
    .getAll("partner_id")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (partnerIds.length === 0) throw new Error("Pick at least one partner");
  const attendeeIds = form
    .getAll("attendee")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

  const db = getDb();
  db.transaction(() => {
    // partner_id keeps the first partner as the "primary" for legacy queries;
    // engagement_partners holds the full set.
    const result = db
      .prepare(
        `INSERT INTO engagements (partner_id, type, date, summary, topics, details)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        partnerIds[0],
        str(form, "type") || "Meeting",
        str(form, "date") || new Date().toISOString().slice(0, 10),
        str(form, "summary"),
        str(form, "topics"),
        str(form, "details")
      );
    const addPartner = db.prepare(
      "INSERT OR IGNORE INTO engagement_partners (engagement_id, partner_id) VALUES (?, ?)"
    );
    for (const pid of partnerIds) addPartner.run(result.lastInsertRowid, pid);
    const addAttendee = db.prepare(
      "INSERT OR IGNORE INTO engagement_attendees (engagement_id, person_id) VALUES (?, ?)"
    );
    for (const personId of attendeeIds) {
      addAttendee.run(result.lastInsertRowid, personId);
    }
  })();
  for (const pid of partnerIds) revalidatePartner(pid);
}

export async function deleteEngagement(form: FormData) {
  getDb().prepare("DELETE FROM engagements WHERE id = ?").run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- Deals ---

export async function createDeal(form: FormData) {
  const partnerId = num(form, "partner_id");
  if (!partnerId) throw new Error("Pick a partner first");
  getDb()
    .prepare(
      `INSERT INTO deals (partner_id, customer, title, value, stage, support_provided, registered_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      partnerId,
      reqStr(form, "customer"),
      str(form, "title"),
      num(form, "value"),
      str(form, "stage") || "Registered",
      str(form, "support_provided"),
      str(form, "registered_date") || new Date().toISOString().slice(0, 10),
      str(form, "notes")
    );
  revalidatePartner(partnerId);
}

export async function updateDealStage(form: FormData) {
  const stage = reqStr(form, "stage");
  const closedDate =
    stage === "Won" || stage === "Lost"
      ? new Date().toISOString().slice(0, 10)
      : "";
  getDb()
    .prepare("UPDATE deals SET stage = ?, closed_date = ? WHERE id = ?")
    .run(stage, closedDate, num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

export async function deleteDeal(form: FormData) {
  getDb().prepare("DELETE FROM deals WHERE id = ?").run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- Salesforce deal import ---

function redirectWithSummary(summary: ImportSummary): never {
  const params = new URLSearchParams({
    imported: String(summary.imported),
    updated: String(summary.updated),
  });
  if (summary.skipped.length > 0) {
    params.set("skipped", summary.skipped.slice(0, 20).join("\n"));
  }
  revalidatePath("/deals");
  revalidatePath("/");
  redirect(`/deals/import?${params.toString()}`);
}

function redirectWithError(message: string): never {
  redirect(`/deals/import?${new URLSearchParams({ error: message })}`);
}

export async function importDealsFromCsv(form: FormData) {
  const vendorId = await getActiveVendorId();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirectWithError("No file uploaded.");
  }
  const { records, error } = parseSalesforceCsv(await file.text());
  if (error) redirectWithError(error);
  redirectWithSummary(importDeals(records, vendorId));
}

export async function importDealsFromSalesforceApi() {
  const vendorId = await getActiveVendorId();
  let summary: ImportSummary;
  try {
    summary = importDeals(await fetchSalesforceDeals(), vendorId);
  } catch (err) {
    redirectWithError(err instanceof Error ? err.message : "Salesforce sync failed.");
  }
  redirectWithSummary(summary);
}

// --- MDF ---

export async function createMdfEntry(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb()
    .prepare(
      `INSERT INTO mdf_entries (partner_id, entry_date, kind, amount, description)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      partnerId,
      str(form, "entry_date") || new Date().toISOString().slice(0, 10),
      str(form, "kind") || "Allocation",
      num(form, "amount"),
      str(form, "description")
    );
  revalidatePartner(partnerId);
}

export async function deleteMdfEntry(form: FormData) {
  getDb().prepare("DELETE FROM mdf_entries WHERE id = ?").run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- Licenses ---

export async function createLicense(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb()
    .prepare(
      `INSERT INTO licenses (partner_id, product, kind, identifier, issued_date, expiry_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      partnerId,
      reqStr(form, "product"),
      str(form, "kind") || "NFR",
      str(form, "identifier"),
      str(form, "issued_date"),
      str(form, "expiry_date"),
      str(form, "notes")
    );
  revalidatePartner(partnerId);
}

export async function deleteLicense(form: FormData) {
  getDb().prepare("DELETE FROM licenses WHERE id = ?").run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- Business goals ---

export async function createGoal(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb()
    .prepare(
      `INSERT INTO business_goals (partner_id, year, title, target, progress_pct, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      partnerId,
      num(form, "year") || new Date().getFullYear(),
      reqStr(form, "title"),
      str(form, "target"),
      Math.min(100, Math.max(0, num(form, "progress_pct"))),
      str(form, "notes")
    );
  revalidatePartner(partnerId);
}

export async function updateGoalProgress(form: FormData) {
  getDb()
    .prepare("UPDATE business_goals SET progress_pct = ? WHERE id = ?")
    .run(Math.min(100, Math.max(0, num(form, "progress_pct"))), num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

export async function deleteGoal(form: FormData) {
  getDb()
    .prepare("DELETE FROM business_goals WHERE id = ?")
    .run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- Competitors ---

export async function createCompetitor(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb()
    .prepare("INSERT INTO competitors (partner_id, vendor, notes) VALUES (?, ?, ?)")
    .run(partnerId, reqStr(form, "vendor"), str(form, "notes"));
  revalidatePartner(partnerId);
}

export async function deleteCompetitor(form: FormData) {
  getDb().prepare("DELETE FROM competitors WHERE id = ?").run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- Needs ---

export async function createNeed(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb()
    .prepare(
      `INSERT INTO needs (partner_id, title, description, priority) VALUES (?, ?, ?, ?)`
    )
    .run(
      partnerId,
      reqStr(form, "title"),
      str(form, "description"),
      str(form, "priority") || "Medium"
    );
  revalidatePartner(partnerId);
}

export async function updateNeedStatus(form: FormData) {
  getDb()
    .prepare("UPDATE needs SET status = ? WHERE id = ?")
    .run(reqStr(form, "status"), num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

export async function deleteNeed(form: FormData) {
  getDb().prepare("DELETE FROM needs WHERE id = ?").run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- Problems ---

export async function createProblem(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb()
    .prepare(
      `INSERT INTO problems (partner_id, title, description, severity) VALUES (?, ?, ?, ?)`
    )
    .run(
      partnerId,
      reqStr(form, "title"),
      str(form, "description"),
      str(form, "severity") || "Medium"
    );
  revalidatePartner(partnerId);
}

export async function updateProblemStatus(form: FormData) {
  getDb()
    .prepare("UPDATE problems SET status = ? WHERE id = ?")
    .run(reqStr(form, "status"), num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

export async function deleteProblem(form: FormData) {
  getDb().prepare("DELETE FROM problems WHERE id = ?").run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- Tiers ---

export async function updateTier(form: FormData) {
  getDb()
    .prepare(
      "UPDATE tiers SET min_active_certs = ?, min_annual_revenue = ? WHERE id = ?"
    )
    .run(num(form, "min_active_certs"), num(form, "min_annual_revenue"), num(form, "id"));
  revalidatePath("/");
  revalidatePath("/partners");
  revalidatePath("/tiers");
  revalidatePath("/partners/[id]", "page");
}
