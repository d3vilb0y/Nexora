import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

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
    CREATE TABLE IF NOT EXISTS tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      rank INTEGER NOT NULL,
      min_active_certs INTEGER NOT NULL DEFAULT 0,
      min_annual_revenue REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  db.exec(
    `INSERT OR IGNORE INTO engagement_attendees (engagement_id, person_id)
     SELECT id, person_id FROM engagements WHERE person_id IS NOT NULL`
  );
  // Engagements used to belong to exactly one partner; mirror into the join table.
  db.exec(
    `INSERT OR IGNORE INTO engagement_partners (engagement_id, partner_id)
     SELECT id, partner_id FROM engagements`
  );

  const tierCount = db.prepare("SELECT COUNT(*) AS c FROM tiers").get() as {
    c: number;
  };
  if (tierCount.c === 0) {
    const insert = db.prepare(
      "INSERT INTO tiers (name, rank, min_active_certs, min_annual_revenue) VALUES (?, ?, ?, ?)"
    );
    insert.run("Authorized", 1, 1, 0);
    insert.run("Silver", 2, 3, 100000);
    insert.run("Gold", 3, 6, 500000);
  }
}

export function getDb(): Database.Database {
  // Reuse the connection across hot reloads in dev.
  if (!global.__nexoraDb) {
    global.__nexoraDb = createDb();
  }
  return global.__nexoraDb;
}
