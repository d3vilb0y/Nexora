import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { ALL_PERMISSIONS, PERMISSION_KEYS } from "./permissions";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "nexora.db");

declare global {
  var __nexoraDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      cert_catalog TEXT NOT NULL DEFAULT '',
      teams_webhook_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      rank INTEGER NOT NULL,
      min_active_certs INTEGER NOT NULL DEFAULT 0,
      min_annual_revenue REAL NOT NULL DEFAULT 0,
      UNIQUE (vendor_id, name)
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
      company_id INTEGER REFERENCES companies(id),
      name TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'Authorized',
      status TEXT NOT NULL DEFAULT 'Active',
      website TEXT NOT NULL DEFAULT '',
      region TEXT NOT NULL DEFAULT '',
      annual_revenue REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS offices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      company_id INTEGER REFERENCES companies(id),
      company_wide INTEGER NOT NULL DEFAULT 0,
      office_id INTEGER REFERENCES offices(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Sales',
      title TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      linkedin_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Active',
      departed_at TEXT NOT NULL DEFAULT '',
      departed_to TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT '',
      issued_date TEXT NOT NULL DEFAULT '',
      expiry_date TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS engagements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
      type TEXT NOT NULL DEFAULT 'Meeting',
      date TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      topics TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS engagement_attendees (
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      PRIMARY KEY (engagement_id, person_id)
    );

    CREATE TABLE IF NOT EXISTS engagement_partners (
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      PRIMARY KEY (engagement_id, partner_id)
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      customer TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      value REAL NOT NULL DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'Registered',
      support_provided TEXT NOT NULL DEFAULT '',
      registered_date TEXT NOT NULL DEFAULT '',
      closed_date TEXT NOT NULL DEFAULT '',
      salesforce_id TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mdf_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      entry_date TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'Allocation',
      amount REAL NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      product TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'NFR',
      identifier TEXT NOT NULL DEFAULT '',
      issued_date TEXT NOT NULL DEFAULT '',
      expiry_date TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      title TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT '',
      progress_pct INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      vendor TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS needs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      severity TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL DEFAULT '',
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attendees_person ON engagement_attendees(person_id);
    CREATE INDEX IF NOT EXISTS idx_engagement_partners ON engagement_partners(partner_id);
    CREATE INDEX IF NOT EXISTS idx_offices_partner ON offices(partner_id);
    CREATE INDEX IF NOT EXISTS idx_deals_partner ON deals(partner_id);
    CREATE INDEX IF NOT EXISTS idx_people_partner ON people(partner_id);
    CREATE INDEX IF NOT EXISTS idx_certs_person ON certifications(person_id);
    CREATE INDEX IF NOT EXISTS idx_engagements_partner ON engagements(partner_id);
    CREATE INDEX IF NOT EXISTS idx_mdf_partner ON mdf_entries(partner_id);
    CREATE INDEX IF NOT EXISTS idx_licenses_partner ON licenses(partner_id);
    CREATE INDEX IF NOT EXISTS idx_goals_partner ON business_goals(partner_id);
    CREATE INDEX IF NOT EXISTS idx_competitors_partner ON competitors(partner_id);
    CREATE INDEX IF NOT EXISTS idx_needs_partner ON needs(partner_id);
    CREATE INDEX IF NOT EXISTS idx_problems_partner ON problems(partner_id);
    CREATE INDEX IF NOT EXISTS idx_followups_partner ON follow_ups(partner_id);
  `);

  // Upgrade databases created before later features existed.
  const hasColumn = (table: string, column: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some(
      (c) => c.name === column
    );
  if (!hasColumn("engagements", "topics")) {
    db.exec("ALTER TABLE engagements ADD COLUMN topics TEXT NOT NULL DEFAULT ''");
  }
  if (!hasColumn("engagements", "details")) {
    db.exec("ALTER TABLE engagements ADD COLUMN details TEXT NOT NULL DEFAULT ''");
  }
  if (!hasColumn("people", "office_id")) {
    db.exec(
      "ALTER TABLE people ADD COLUMN office_id INTEGER REFERENCES offices(id) ON DELETE SET NULL"
    );
  }
  if (!hasColumn("deals", "salesforce_id")) {
    db.exec("ALTER TABLE deals ADD COLUMN salesforce_id TEXT NOT NULL DEFAULT ''");
  }
  if (!hasColumn("vendors", "teams_webhook_url")) {
    db.exec("ALTER TABLE vendors ADD COLUMN teams_webhook_url TEXT NOT NULL DEFAULT ''");
  }
  db.exec(
    `INSERT OR IGNORE INTO engagement_attendees (engagement_id, person_id)
     SELECT id, person_id FROM engagements WHERE person_id IS NOT NULL`
  );
  // Engagements used to belong to exactly one partner; mirror into the join table.
  db.exec(
    `INSERT OR IGNORE INTO engagement_partners (engagement_id, partner_id)
     SELECT id, partner_id FROM engagements`
  );

  migrateToMultiVendor(db, hasColumn);
  migrateToSharedPeople(db, hasColumn);
  migrateAuth(db);
}

/**
 * OIDC login + RBAC. Users are provisioned on first OIDC login (or ahead of
 * time in the GUI); roles bundle permissions from the code-level catalog in
 * lib/permissions.ts. The built-in Admin role holds the wildcard permission so
 * it automatically covers permissions added in later releases.
 */
function migrateAuth(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sub TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      built_in INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission TEXT NOT NULL,
      PRIMARY KEY (role_id, permission)
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id_token TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
  `);

  // The built-in Admin role always exists and always means "everything".
  db.prepare(
    "INSERT OR IGNORE INTO roles (name, description, built_in) VALUES ('Admin', 'Full access to everything, including user & role management.', 1)"
  ).run();
  const adminRoleId = (
    db.prepare("SELECT id FROM roles WHERE name = 'Admin'").get() as {
      id: number;
    }
  ).id;
  db.prepare(
    "INSERT OR IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)"
  ).run(adminRoleId, ALL_PERMISSIONS);

  // Starter roles, seeded only while Admin is alone — admins can reshape or
  // delete them afterwards without them resurrecting on the next boot.
  const roleCount = (
    db.prepare("SELECT COUNT(*) AS c FROM roles").get() as { c: number }
  ).c;
  if (roleCount === 1) {
    const insertRole = db.prepare(
      "INSERT INTO roles (name, description) VALUES (?, ?)"
    );
    const insertPerm = db.prepare(
      "INSERT INTO role_permissions (role_id, permission) VALUES (?, ?)"
    );
    const managerId = Number(
      insertRole.run(
        "Manager",
        "Work with all CRM data; no vendor or access administration."
      ).lastInsertRowid
    );
    for (const key of PERMISSION_KEYS) {
      if (key !== "vendors.manage" && key !== "access.manage") {
        insertPerm.run(managerId, key);
      }
    }
    const viewerId = Number(
      insertRole.run("Viewer", "Read-only access to the CRM.").lastInsertRowid
    );
    for (const key of PERMISSION_KEYS) {
      if (key.endsWith(".view") || key === "search.use") {
        insertPerm.run(viewerId, key);
      }
    }
  }

  // Bootstrap admin: pre-provision the user named by env so the very first
  // OIDC login (matched by email) lands with the Admin role already attached.
  const adminEmail = process.env.NEXORA_ADMIN_EMAIL?.trim();
  if (adminEmail) {
    db.prepare(
      "INSERT OR IGNORE INTO users (email, name) VALUES (?, 'Bootstrap admin')"
    ).run(adminEmail);
    const user = db
      .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
      .get(adminEmail) as { id: number };
    db.prepare(
      "INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)"
    ).run(user.id, adminRoleId);
  }
}

/**
 * People used to belong to exactly one partner (one vendor). A real person
 * works for a company that can sell several vendors, so:
 *   - partner rows that are the same company are grouped by a company_id;
 *   - Sales/Management people are company_wide and surface under every vendor
 *     the company is engaged with;
 *   - certifications carry the vendor whose program they belong to, so a
 *     person can hold (say) F5 and Check Point certs independently.
 */
function migrateToSharedPeople(
  db: Database.Database,
  hasColumn: (table: string, column: string) => boolean
) {
  // On a fresh database the columns already exist (created above); the ALTERs
  // only fire when upgrading an older single-vendor-per-person database.
  const peopleNeedFlagging = !hasColumn("people", "company_id");
  if (!hasColumn("partners", "company_id")) {
    db.exec("ALTER TABLE partners ADD COLUMN company_id INTEGER REFERENCES companies(id)");
  }
  if (!hasColumn("people", "company_id")) {
    db.exec("ALTER TABLE people ADD COLUMN company_id INTEGER REFERENCES companies(id)");
  }
  if (!hasColumn("people", "company_wide")) {
    db.exec("ALTER TABLE people ADD COLUMN company_wide INTEGER NOT NULL DEFAULT 0");
  }
  if (!hasColumn("certifications", "vendor_id")) {
    db.exec("ALTER TABLE certifications ADD COLUMN vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE");
  }

  // Give every partner a company, sharing one company across partner rows that
  // carry the same name (case-insensitive) — that's how the same firm under
  // two vendors gets linked.
  const orphanPartners = db
    .prepare("SELECT id, name FROM partners WHERE company_id IS NULL")
    .all() as { id: number; name: string }[];
  if (orphanPartners.length > 0) {
    const findCompany = db.prepare(
      "SELECT id FROM companies WHERE name = ? COLLATE NOCASE"
    );
    const insertCompany = db.prepare("INSERT INTO companies (name) VALUES (?)");
    const setPartnerCompany = db.prepare(
      "UPDATE partners SET company_id = ? WHERE id = ?"
    );
    for (const p of orphanPartners) {
      const existing = findCompany.get(p.name) as { id: number } | undefined;
      const companyId =
        existing?.id ?? Number(insertCompany.run(p.name).lastInsertRowid);
      setPartnerCompany.run(companyId, p.id);
    }
  }

  // People inherit their (home) partner's company; legacy certs inherit the
  // vendor of the person's home partner.
  db.exec(
    `UPDATE people SET company_id = (
       SELECT company_id FROM partners WHERE partners.id = people.partner_id
     ) WHERE company_id IS NULL`
  );
  db.exec(
    `UPDATE certifications SET vendor_id = (
       SELECT pa.vendor_id FROM people pe
       JOIN partners pa ON pa.id = pe.partner_id
       WHERE pe.id = certifications.person_id
     ) WHERE vendor_id IS NULL`
  );

  // First upgrade only: existing Sales/Management become company-wide so they
  // follow the company into any newly added vendor.
  if (peopleNeedFlagging) {
    db.exec(
      "UPDATE people SET company_wide = 1 WHERE role IN ('Sales', 'Management')"
    );
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_partners_company ON partners(company_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_people_company ON people(company_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_certs_vendor ON certifications(vendor_id)");
}

/** Find an existing company by name (case-insensitive) or create one. */
export function resolveCompanyId(
  db: Database.Database,
  name: string
): number {
  const existing = db
    .prepare("SELECT id FROM companies WHERE name = ? COLLATE NOCASE")
    .get(name) as { id: number } | undefined;
  if (existing) return existing.id;
  return Number(
    db.prepare("INSERT INTO companies (name) VALUES (?)").run(name).lastInsertRowid
  );
}

/**
 * The CRM used to track a single vendor's partner landscape. This brings the
 * schema up to multiple vendors (tillverkare): every partner and every program
 * tier now belongs to a vendor, and there is always at least one vendor so new
 * partners have somewhere to land.
 */
function migrateToMultiVendor(
  db: Database.Database,
  hasColumn: (table: string, column: string) => boolean
) {
  // Make sure there's a vendor to attach existing data to.
  const vendorCount = (
    db.prepare("SELECT COUNT(*) AS c FROM vendors").get() as { c: number }
  ).c;
  let defaultVendorId: number;
  if (vendorCount === 0) {
    defaultVendorId = Number(
      db
        .prepare(
          "INSERT INTO vendors (name, description) VALUES (?, ?)"
        )
        .run("Default", "Auto-created vendor — rename me in Admin.")
        .lastInsertRowid
    );
  } else {
    defaultVendorId = (
      db.prepare("SELECT id FROM vendors ORDER BY id LIMIT 1").get() as {
        id: number;
      }
    ).id;
  }

  // partners.vendor_id: add the column and backfill onto the default vendor.
  if (!hasColumn("partners", "vendor_id")) {
    db.exec("ALTER TABLE partners ADD COLUMN vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE");
  }
  db.prepare("UPDATE partners SET vendor_id = ? WHERE vendor_id IS NULL").run(
    defaultVendorId
  );

  // tiers.vendor_id: the legacy table had a global UNIQUE(name) and no vendor,
  // which blocks two vendors from both having a "Gold". Rebuild it when needed.
  if (!hasColumn("tiers", "vendor_id")) {
    db.exec(`
      ALTER TABLE tiers RENAME TO tiers_legacy;
      CREATE TABLE tiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        rank INTEGER NOT NULL,
        min_active_certs INTEGER NOT NULL DEFAULT 0,
        min_annual_revenue REAL NOT NULL DEFAULT 0,
        UNIQUE (vendor_id, name)
      );
      INSERT INTO tiers (vendor_id, name, rank, min_active_certs, min_annual_revenue)
        SELECT ${defaultVendorId}, name, rank, min_active_certs, min_annual_revenue
        FROM tiers_legacy;
      DROP TABLE tiers_legacy;
    `);
  }
  db.prepare("UPDATE tiers SET vendor_id = ? WHERE vendor_id IS NULL").run(
    defaultVendorId
  );

  db.exec("CREATE INDEX IF NOT EXISTS idx_partners_vendor ON partners(vendor_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_tiers_vendor ON tiers(vendor_id)");

  // Guarantee every vendor has a usable program tier ladder.
  const vendors = db.prepare("SELECT id FROM vendors").all() as { id: number }[];
  for (const v of vendors) ensureVendorTiers(db, v.id);
}

/** Seed the default program tiers for a vendor that has none yet. */
export function ensureVendorTiers(db: Database.Database, vendorId: number) {
  const count = (
    db
      .prepare("SELECT COUNT(*) AS c FROM tiers WHERE vendor_id = ?")
      .get(vendorId) as { c: number }
  ).c;
  if (count > 0) return;
  const insert = db.prepare(
    "INSERT INTO tiers (vendor_id, name, rank, min_active_certs, min_annual_revenue) VALUES (?, ?, ?, ?, ?)"
  );
  insert.run(vendorId, "Authorized", 1, 1, 0);
  insert.run(vendorId, "Silver", 2, 3, 100000);
  insert.run(vendorId, "Gold", 3, 6, 500000);
}

export function getDb(): Database.Database {
  // Reuse the connection across hot reloads in dev.
  if (!global.__nexoraDb) {
    global.__nexoraDb = createDb();
  }
  return global.__nexoraDb;
}
