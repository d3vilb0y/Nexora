import type { DashboardData } from "./data";
import type { Vendor } from "./types";
import { formatMoney } from "./health";

/**
 * Microsoft Teams integration via the modern "Workflows" (Power Automate)
 * incoming webhook, which replaced the retired Office 365 connectors. A
 * Workflow built from the "Post to a channel when a webhook request is
 * received" template hands you an HTTPS URL that accepts a JSON POST; we send
 * an Adaptive Card wrapped in the message/attachments envelope it expects.
 *
 * The whole integration is optional and per-vendor: nothing is sent unless a
 * URL is configured for that vendor in Admin.
 */

/** True when the vendor has a usable Teams webhook configured. */
export function isTeamsConfigured(vendor: Vendor): boolean {
  return /^https:\/\/\S+/i.test(vendor.teams_webhook_url.trim());
}

type AdaptiveElement = Record<string, unknown>;

function card(body: AdaptiveElement[]) {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body,
        },
      },
    ],
  };
}

function heading(text: string): AdaptiveElement {
  return { type: "TextBlock", size: "Large", weight: "Bolder", text, wrap: true };
}

/** A short "is this wired up?" card for the Send test button. */
export function buildTestCard(vendor: Vendor) {
  return card([
    heading(`Nexora connected — ${vendor.name}`),
    {
      type: "TextBlock",
      wrap: true,
      text: `This channel will receive partner-health digests for the ${vendor.name} landscape.`,
    },
  ]);
}

/** The partner-health digest for a vendor, built from dashboard data. */
export function buildDigestCard(vendor: Vendor, data: DashboardData) {
  const overdue = data.openFollowUps.filter((f) => f.overdue);
  const body: AdaptiveElement[] = [
    heading(`Partner digest — ${vendor.name}`),
    {
      type: "FactSet",
      facts: [
        { title: "Certs expiring ≤90d", value: String(data.expiringCerts.length) },
        { title: "Tiers at risk", value: String(data.tierAtRisk.length) },
        { title: "Quiet partners (60d+)", value: String(data.quietPartners.length) },
        { title: "Overdue follow-ups", value: String(overdue.length) },
        { title: "Open follow-ups", value: String(data.openFollowUps.length) },
        { title: "Recent departures", value: String(data.recentDepartures.length) },
      ],
    },
  ];

  const bullets = (title: string, lines: string[]) => {
    if (lines.length === 0) return;
    body.push({ type: "TextBlock", weight: "Bolder", spacing: "Medium", text: title });
    for (const line of lines.slice(0, 5)) {
      body.push({ type: "TextBlock", wrap: true, text: `• ${line}` });
    }
  };

  bullets(
    "Overdue follow-ups",
    overdue.map((f) => `${f.partner_name}: ${f.title} (due ${f.due_date})`)
  );
  bullets(
    "Certs expiring soon",
    data.expiringCerts.map(
      (c) =>
        `${c.partner_name} — ${c.person_name}'s ${c.name}` +
        (c.days < 0 ? ` expired ${Math.abs(c.days)}d ago` : ` in ${c.days}d`)
    )
  );
  bullets(
    "Tiers at risk",
    data.tierAtRisk.map((p) => {
      const parts: string[] = [];
      if (p.gap.maintainCertGap > 0)
        parts.push(`${p.gap.maintainCertGap} more cert${p.gap.maintainCertGap > 1 ? "s" : ""}`);
      if (p.gap.maintainRevenueGap > 0)
        parts.push(`${formatMoney(p.gap.maintainRevenueGap)} revenue short`);
      return `${p.name} (${p.tier})${parts.length ? " — " + parts.join(", ") : ""}`;
    })
  );

  return card(body);
}

/** POST a payload to a Teams webhook. Never throws — returns a result. */
export async function postToTeams(
  url: string,
  payload: unknown
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      return {
        ok: false,
        error: `Teams responded ${res.status}${detail ? `: ${detail}` : ""}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error posting to Teams",
    };
  }
}
