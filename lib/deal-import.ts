import { getDb } from "./db";
import { findColumn, parseCsv } from "./csv";

export type ImportRecord = {
  salesforceId: string;
  partnerName: string;
  customer: string;
  title: string;
  value: number;
  stage: string;
  closeDate: string;
};

export type ImportSummary = {
  imported: number;
  updated: number;
  skipped: string[];
};

/** Map Salesforce opportunity stages onto our deal stages. */
export function mapStage(sfStage: string): { stage: string; closed: boolean } {
  const s = sfStage.toLowerCase();
  if (s.includes("won")) return { stage: "Won", closed: true };
  if (s.includes("lost") || s.includes("closed")) {
    return { stage: "Lost", closed: true };
  }
  if (s.includes("prospect") || s.includes("qualif")) {
    return { stage: "Registered", closed: false };
  }
  return { stage: "In progress", closed: false };
}

export function importDeals(records: ImportRecord[]): ImportSummary {
  const db = getDb();
  const partners = db
    .prepare("SELECT id, name FROM partners")
    .all() as { id: number; name: string }[];
  const byName = new Map(partners.map((p) => [p.name.trim().toLowerCase(), p.id]));

  const findBySfId = db.prepare(
    "SELECT id FROM deals WHERE salesforce_id = ? AND salesforce_id != ''"
  );
  const update = db.prepare(
    `UPDATE deals SET partner_id = ?, customer = ?, title = ?, value = ?, stage = ?, closed_date = ? WHERE id = ?`
  );
  const insert = db.prepare(
    `INSERT INTO deals (partner_id, customer, title, value, stage, support_provided, registered_date, closed_date, salesforce_id, notes)
     VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, 'Imported from Salesforce')`
  );

  const summary: ImportSummary = { imported: 0, updated: 0, skipped: [] };
  const today = new Date().toISOString().slice(0, 10);

  db.transaction(() => {
    for (const rec of records) {
      const partnerId = byName.get(rec.partnerName.trim().toLowerCase());
      if (!partnerId) {
        summary.skipped.push(
          `${rec.title || rec.customer || rec.salesforceId}: no partner named "${rec.partnerName}"`
        );
        continue;
      }
      if (!rec.customer && !rec.title) {
        summary.skipped.push(`${rec.salesforceId || "row"}: no customer or opportunity name`);
        continue;
      }
      const { stage, closed } = mapStage(rec.stage);
      const closedDate = closed ? rec.closeDate || today : "";
      const existing = rec.salesforceId
        ? (findBySfId.get(rec.salesforceId) as { id: number } | undefined)
        : undefined;
      if (existing) {
        update.run(partnerId, rec.customer, rec.title, rec.value, stage, closedDate, existing.id);
        summary.updated++;
      } else {
        insert.run(
          partnerId,
          rec.customer || rec.title,
          rec.title,
          rec.value,
          stage,
          today,
          closedDate,
          rec.salesforceId
        );
        summary.imported++;
      }
    }
  })();
  return summary;
}

/**
 * Parse a Salesforce opportunity report CSV. Recognized headers
 * (case-insensitive, several aliases each):
 *   Partner / Partner Name / Partner Account
 *   Account Name / Customer / End Customer
 *   Opportunity Name / Name / Deal
 *   Amount / Value
 *   Stage / Stage Name
 *   Close Date / CloseDate
 *   Opportunity ID / Id  (optional, enables re-import dedupe)
 */
export function parseSalesforceCsv(text: string): {
  records: ImportRecord[];
  error?: string;
} {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { records: [], error: "CSV has no data rows." };
  }
  const header = rows[0];
  const partnerCol = findColumn(header, "partner", "partner name", "partner account", "partner__c");
  const customerCol = findColumn(header, "account name", "customer", "end customer", "account");
  const titleCol = findColumn(header, "opportunity name", "name", "deal", "opportunity");
  const amountCol = findColumn(header, "amount", "value");
  const stageCol = findColumn(header, "stage", "stage name", "stagename");
  const closeCol = findColumn(header, "close date", "closedate");
  const idCol = findColumn(header, "opportunity id", "id", "opportunity_id");

  if (partnerCol === -1) {
    return {
      records: [],
      error:
        'Could not find a partner column. Expected a header like "Partner", "Partner Name" or "Partner Account".',
    };
  }
  if (titleCol === -1 && customerCol === -1) {
    return {
      records: [],
      error:
        'Could not find an opportunity column. Expected "Opportunity Name" (and ideally "Account Name").',
    };
  }

  const records = rows.slice(1).map((row) => ({
    salesforceId: idCol !== -1 ? (row[idCol] ?? "").trim() : "",
    partnerName: (row[partnerCol] ?? "").trim(),
    customer: customerCol !== -1 ? (row[customerCol] ?? "").trim() : "",
    title: titleCol !== -1 ? (row[titleCol] ?? "").trim() : "",
    value:
      amountCol !== -1
        ? Number((row[amountCol] ?? "0").replace(/[^0-9.-]/g, "")) || 0
        : 0,
    stage: stageCol !== -1 ? (row[stageCol] ?? "").trim() : "",
    closeDate: closeCol !== -1 ? (row[closeCol] ?? "").trim() : "",
  }));
  return { records };
}

export function salesforceConfigured(): boolean {
  return Boolean(process.env.SF_INSTANCE_URL && process.env.SF_ACCESS_TOKEN);
}

/**
 * Pull opportunities straight from the Salesforce REST API.
 * Requires env vars:
 *   SF_INSTANCE_URL  e.g. https://yourorg.my.salesforce.com
 *   SF_ACCESS_TOKEN  a session/connected-app token
 * Optional:
 *   SF_PARTNER_FIELD field holding the partner name (default Account.Name)
 *   SF_SOQL_WHERE    extra filter, e.g. "Partner_Account__c != null"
 */
export async function fetchSalesforceDeals(): Promise<ImportRecord[]> {
  const instance = process.env.SF_INSTANCE_URL!.replace(/\/$/, "");
  const partnerField = process.env.SF_PARTNER_FIELD || "Account.Name";
  const where = process.env.SF_SOQL_WHERE ? ` WHERE ${process.env.SF_SOQL_WHERE}` : "";
  const soql = `SELECT Id, Name, Amount, StageName, CloseDate, Account.Name, ${partnerField} FROM Opportunity${where} ORDER BY CloseDate DESC LIMIT 200`;
  const res = await fetch(
    `${instance}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
    {
      headers: { Authorization: `Bearer ${process.env.SF_ACCESS_TOKEN}` },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Salesforce API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    records: Record<string, unknown>[];
  };

  const dig = (obj: Record<string, unknown>, dotted: string): string => {
    let cur: unknown = obj;
    for (const key of dotted.split(".")) {
      if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[key];
      else return "";
    }
    return cur == null ? "" : String(cur);
  };

  return data.records.map((r) => ({
    salesforceId: dig(r, "Id"),
    partnerName: dig(r, partnerField),
    customer: dig(r, "Account.Name"),
    title: dig(r, "Name"),
    value: Number(dig(r, "Amount")) || 0,
    stage: dig(r, "StageName"),
    closeDate: dig(r, "CloseDate"),
  }));
}
