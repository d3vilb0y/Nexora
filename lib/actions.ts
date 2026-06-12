"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "./db";

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
}

// --- Partners ---

export async function createPartner(form: FormData) {
  const result = getDb()
    .prepare(
      `INSERT INTO partners (name, tier, status, website, region, annual_revenue, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      reqStr(form, "name"),
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
  const id = num(form, "id");
  getDb().prepare("DELETE FROM partners WHERE id = ?").run(id);
  revalidatePartner(id);
  redirect("/partners");
}

// --- People ---

export async function createPerson(form: FormData) {
  const partnerId = num(form, "partner_id");
  getDb()
    .prepare(
      `INSERT INTO people (partner_id, name, role, title, email, phone, linkedin_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      partnerId,
      reqStr(form, "name"),
      str(form, "role") || "Sales",
      str(form, "title"),
      str(form, "email"),
      str(form, "phone"),
      str(form, "linkedin_url"),
      str(form, "notes")
    );
  revalidatePartner(partnerId);
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
  getDb()
    .prepare(
      `INSERT INTO certifications (person_id, name, level, issued_date, expiry_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      num(form, "person_id"),
      reqStr(form, "name"),
      str(form, "level"),
      str(form, "issued_date"),
      str(form, "expiry_date"),
      str(form, "notes")
    );
  revalidatePartner(num(form, "partner_id"));
}

export async function deleteCertification(form: FormData) {
  getDb()
    .prepare("DELETE FROM certifications WHERE id = ?")
    .run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
}

// --- Engagements ---

export async function createEngagement(form: FormData) {
  const partnerId = num(form, "partner_id");
  const personId = num(form, "person_id");
  getDb()
    .prepare(
      `INSERT INTO engagements (partner_id, person_id, type, date, summary)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      partnerId,
      personId > 0 ? personId : null,
      str(form, "type") || "Meeting",
      str(form, "date") || new Date().toISOString().slice(0, 10),
      str(form, "summary")
    );
  revalidatePartner(partnerId);
}

export async function deleteEngagement(form: FormData) {
  getDb().prepare("DELETE FROM engagements WHERE id = ?").run(num(form, "id"));
  revalidatePartner(num(form, "partner_id"));
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
