import Link from "next/link";
import type { ReactNode } from "react";
import { certStatus } from "@/lib/health";
import type { HealthScore } from "@/lib/health";

const BADGE_COLORS: Record<string, string> = {
  // tiers
  Gold: "bg-amber-100 text-amber-800",
  Silver: "bg-slate-200 text-slate-700",
  Authorized: "bg-sky-100 text-sky-800",
  // generic statuses
  Active: "bg-emerald-100 text-emerald-800",
  Onboarding: "bg-sky-100 text-sky-800",
  Inactive: "bg-slate-200 text-slate-600",
  Departed: "bg-rose-100 text-rose-800",
  // priorities / severities
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-orange-100 text-orange-800",
  Critical: "bg-rose-100 text-rose-800",
  // item statuses
  Open: "bg-sky-100 text-sky-800",
  "In progress": "bg-amber-100 text-amber-800",
  Monitoring: "bg-amber-100 text-amber-800",
  Done: "bg-emerald-100 text-emerald-800",
  Resolved: "bg-emerald-100 text-emerald-800",
  // roles
  Sales: "bg-violet-100 text-violet-800",
  Technical: "bg-cyan-100 text-cyan-800",
  Management: "bg-indigo-100 text-indigo-800",
};

export function Badge({ value }: { value: string }) {
  const color = BADGE_COLORS[value] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${color}`}
    >
      {value}
    </span>
  );
}

export function HealthBadge({ health }: { health: HealthScore }) {
  const color =
    health.label === "Healthy"
      ? "bg-emerald-100 text-emerald-800"
      : health.label === "Watch"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${color}`}
      title={`Certs ${health.certScore} · Engagement ${health.engagementScore} · Problems ${health.problemScore}`}
    >
      {health.score} · {health.label}
    </span>
  );
}

export function CertExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const { status, days } = certStatus(expiryDate);
  if (status === "No expiry")
    return <span className="text-xs text-slate-400">no expiry</span>;
  if (status === "Expired")
    return (
      <span className="inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 whitespace-nowrap">
        expired {Math.abs(days!)}d ago
      </span>
    );
  if (status === "Expiring")
    return (
      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 whitespace-nowrap">
        expires in {days}d
      </span>
    );
  return (
    <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 whitespace-nowrap">
      valid · {days}d left
    </span>
  );
}

export function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}

export const inputCls =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none";
export const labelCls = "block text-xs font-medium text-slate-500 mb-1";
export const btnCls =
  "rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700";
export const btnDangerCls =
  "rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export function PartnerLink({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  return (
    <Link
      href={`/partners/${id}`}
      className="font-medium text-sky-700 hover:underline"
    >
      {name}
    </Link>
  );
}
