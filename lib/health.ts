import type { Tier } from "./types";

export const MS_PER_DAY = 86400000;

export function daysUntil(isoDate: string): number | null {
  if (!isoDate) return null;
  const target = new Date(isoDate + "T00:00:00Z").getTime();
  if (Number.isNaN(target)) return null;
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  return Math.round((target - todayUtc) / MS_PER_DAY);
}

export function daysSince(isoDate: string): number | null {
  const d = daysUntil(isoDate);
  return d === null ? null : -d;
}

export type CertStatus = "Valid" | "Expiring" | "Expired" | "No expiry";

export function certStatus(expiryDate: string): {
  status: CertStatus;
  days: number | null;
} {
  const days = daysUntil(expiryDate);
  if (days === null) return { status: "No expiry", days: null };
  if (days < 0) return { status: "Expired", days };
  if (days <= 90) return { status: "Expiring", days };
  return { status: "Valid", days };
}

export type HealthInput = {
  activeCertCount: number;
  requiredCerts: number;
  daysSinceLastEngagement: number | null;
  openProblems: { severity: string }[];
};

export type HealthScore = {
  score: number;
  label: "Healthy" | "Watch" | "At risk";
  certScore: number;
  engagementScore: number;
  problemScore: number;
};

const SEVERITY_WEIGHT: Record<string, number> = {
  Critical: 40,
  High: 25,
  Medium: 10,
  Low: 5,
};

export function computeHealth(input: HealthInput): HealthScore {
  const certScore =
    input.requiredCerts <= 0
      ? 100
      : Math.min(
          100,
          Math.round((input.activeCertCount / input.requiredCerts) * 100)
        );

  let engagementScore: number;
  if (input.daysSinceLastEngagement === null) {
    engagementScore = 0;
  } else if (input.daysSinceLastEngagement <= 30) {
    engagementScore = 100;
  } else if (input.daysSinceLastEngagement >= 180) {
    engagementScore = 0;
  } else {
    engagementScore = Math.round(
      100 - ((input.daysSinceLastEngagement - 30) / 150) * 100
    );
  }

  const penalty = input.openProblems.reduce(
    (sum, p) => sum + (SEVERITY_WEIGHT[p.severity] ?? 10),
    0
  );
  const problemScore = Math.max(0, 100 - penalty);

  const score = Math.round(
    certScore * 0.4 + engagementScore * 0.35 + problemScore * 0.25
  );
  const label = score >= 75 ? "Healthy" : score >= 50 ? "Watch" : "At risk";
  return { score, label, certScore, engagementScore, problemScore };
}

export type GapAnalysis = {
  currentTier: Tier | null;
  nextTier: Tier | null;
  activeCertCount: number;
  annualRevenue: number;
  maintainCertGap: number;
  maintainRevenueGap: number;
  advanceCertGap: number | null;
  advanceRevenueGap: number | null;
  tierAtRisk: boolean;
};

export function gapAnalysis(
  tiers: Tier[],
  partnerTier: string,
  activeCertCount: number,
  annualRevenue: number
): GapAnalysis {
  const sorted = [...tiers].sort((a, b) => a.rank - b.rank);
  const currentTier = sorted.find((t) => t.name === partnerTier) ?? null;
  const nextTier = currentTier
    ? sorted.find((t) => t.rank > currentTier.rank) ?? null
    : null;

  const maintainCertGap = currentTier
    ? Math.max(0, currentTier.min_active_certs - activeCertCount)
    : 0;
  const maintainRevenueGap = currentTier
    ? Math.max(0, currentTier.min_annual_revenue - annualRevenue)
    : 0;

  return {
    currentTier,
    nextTier,
    activeCertCount,
    annualRevenue,
    maintainCertGap,
    maintainRevenueGap,
    advanceCertGap: nextTier
      ? Math.max(0, nextTier.min_active_certs - activeCertCount)
      : null,
    advanceRevenueGap: nextTier
      ? Math.max(0, nextTier.min_annual_revenue - annualRevenue)
      : null,
    tierAtRisk: maintainCertGap > 0 || maintainRevenueGap > 0,
  };
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatDate(isoDate: string): string {
  return isoDate || "—";
}
