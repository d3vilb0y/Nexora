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

export type SalesforceAuthMode =
  | "oauth-refresh"
  | "oauth-client-credentials"
  | "static-token"
  | "none";

/** Which credentials are present, in priority order. */
export function salesforceAuthMode(): SalesforceAuthMode {
  if (process.env.SF_CLIENT_ID && process.env.SF_CLIENT_SECRET) {
    return process.env.SF_REFRESH_TOKEN
      ? "oauth-refresh"
      : "oauth-client-credentials";
  }
  if (process.env.SF_INSTANCE_URL && process.env.SF_ACCESS_TOKEN) {
    return "static-token";
  }
  return "none";
}

export function salesforceConfigured(): boolean {
  return salesforceAuthMode() !== "none";
}

type TokenCache = {
  accessToken: string;
  instanceUrl: string;
  // Earliest wall-clock time (ms) at which we should proactively refresh.
  refreshAfter: number;
};

// Survive Next.js dev hot-reloads so we don't re-auth on every edit.
declare global {
  var __sfToken: TokenCache | undefined;
}

function tokenEndpoint(): string {
  const base = (
    process.env.SF_LOGIN_URL || "https://login.salesforce.com"
  ).replace(/\/$/, "");
  return `${base}/services/oauth2/token`;
}

/**
 * Obtain an access token via OAuth, or fall back to a static SF_ACCESS_TOKEN.
 *   client_credentials: SF_CLIENT_ID + SF_CLIENT_SECRET (connected app with a
 *                       run-as user; simplest server-to-server)
 *   refresh_token:      additionally set SF_REFRESH_TOKEN
 * The returned instance_url from Salesforce is preferred over SF_INSTANCE_URL.
 */
async function requestAccessToken(): Promise<TokenCache> {
  const mode = salesforceAuthMode();
  if (mode === "static-token") {
    return {
      accessToken: process.env.SF_ACCESS_TOKEN!,
      instanceUrl: process.env.SF_INSTANCE_URL!.replace(/\/$/, ""),
      // Static tokens can't be refreshed; treat as always "fresh" and let a
      // 401 surface the real error.
      refreshAfter: Number.MAX_SAFE_INTEGER,
    };
  }
  if (mode === "none") {
    throw new Error("Salesforce is not configured.");
  }

  const body = new URLSearchParams({
    client_id: process.env.SF_CLIENT_ID!,
    client_secret: process.env.SF_CLIENT_SECRET!,
  });
  if (mode === "oauth-refresh") {
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", process.env.SF_REFRESH_TOKEN!);
  } else {
    body.set("grant_type", "client_credentials");
  }

  const res = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Salesforce auth failed (${res.status}): ${(await res.text()).slice(0, 300)}`
    );
  }
  const data = (await res.json()) as {
    access_token?: string;
    instance_url?: string;
    expires_in?: number;
  };
  const instanceUrl = (
    data.instance_url ||
    process.env.SF_INSTANCE_URL ||
    ""
  ).replace(/\/$/, "");
  if (!data.access_token || !instanceUrl) {
    throw new Error(
      "Salesforce auth response missing access_token or instance_url."
    );
  }
  // expires_in is seconds when present; otherwise assume a conservative 15 min.
  const ttlMs = (data.expires_in ? data.expires_in : 900) * 1000;
  return {
    accessToken: data.access_token,
    instanceUrl,
    refreshAfter: Date.now() + Math.max(0, ttlMs - 60_000),
  };
}

async function getAccessToken(forceRefresh = false): Promise<TokenCache> {
  if (
    !forceRefresh &&
    globalThis.__sfToken &&
    Date.now() < globalThis.__sfToken.refreshAfter
  ) {
    return globalThis.__sfToken;
  }
  globalThis.__sfToken = await requestAccessToken();
  return globalThis.__sfToken;
}

/**
 * Pull opportunities straight from the Salesforce REST API.
 * Auth (in priority order):
 *   SF_CLIENT_ID + SF_CLIENT_SECRET            → client_credentials grant
 *   (+ SF_REFRESH_TOKEN)                       → refresh_token grant
 *   SF_INSTANCE_URL + SF_ACCESS_TOKEN          → static token (legacy)
 * Optional:
 *   SF_LOGIN_URL     token host (default https://login.salesforce.com)
 *   SF_INSTANCE_URL  API host if the token response omits instance_url
 *   SF_PARTNER_FIELD field holding the partner name (default Account.Name)
 *   SF_SOQL_WHERE    extra filter, e.g. "Partner_Account__c != null"
 */
export async function fetchSalesforceDeals(): Promise<ImportRecord[]> {
  const partnerField = process.env.SF_PARTNER_FIELD || "Account.Name";
  const where = process.env.SF_SOQL_WHERE ? ` WHERE ${process.env.SF_SOQL_WHERE}` : "";
  // Dedupe so the default partnerField (Account.Name) isn't selected twice.
  const fields = Array.from(
    new Set(["Id", "Name", "Amount", "StageName", "CloseDate", "Account.Name", partnerField])
  );
  const soql = `SELECT ${fields.join(", ")} FROM Opportunity${where} ORDER BY CloseDate DESC LIMIT 200`;

  const query = (token: TokenCache) =>
    fetch(
      `${token.instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
      {
        headers: { Authorization: `Bearer ${token.accessToken}` },
        cache: "no-store",
      }
    );

  let token = await getAccessToken();
  let res = await query(token);
  if (res.status === 401) {
    // Token expired or revoked — re-authenticate once and retry.
    token = await getAccessToken(true);
    res = await query(token);
  }
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
