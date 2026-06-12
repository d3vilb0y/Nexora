# Nexora — Partner CRM

A lightweight CRM for managing channel partners: the companies, their sales
and technical people, certification levels and expiry dates, engagement
history, MDF budgets, NFR licenses, joint business plans, needs and problems —
with a health score and tier gap analysis on top.

## Features

- **Partners** — tier (Authorized / Silver / Gold), status, region, revenue, notes.
- **Personnel** — sales & technical contacts per partner with LinkedIn profiles,
  plus **churn tracking**: mark a person departed, record where they went, and
  see how that affects the partner's tier.
- **Certifications with expiry alerts** — "Anna's ZIA cert expires in 60 days"
  reminders on the dashboard (90-day window), since tier status often depends
  on keeping N people certified. Certs held by departed people stop counting.
- **Tier gap analysis** — per-tier requirements (cert count, revenue) are
  editable on the Tiers page; each partner page shows what's missing to
  maintain the current tier or advance to the next one, and the dashboard
  flags tiers at risk.
- **Engagement history** — QBRs, enablement sessions, calls per partner and
  person; partners with no touchpoint in 60+ days surface as "gone quiet".
- **MDF / co-op funds** — allocation and usage ledger with running balance.
- **NFR / lab licenses** — demo tenants and gear per partner, with expiry alerts.
- **Joint business plans** — yearly goals with progress bars.
- **Competitive overlap** — which competing vendors each partner also sells.
- **Health score** — 0–100 composite of certification coverage (40%),
  engagement recency (35%) and open-problem pressure (25%).

## Stack

Next.js (App Router, server components + server actions), Tailwind CSS, and
SQLite via `better-sqlite3`. The database lives in `data/nexora.db` (created
automatically, not committed).

## Getting started

```bash
npm install
npm run seed   # optional: load demo data (wipes existing data)
npm run dev    # http://localhost:3000
```

## Production

```bash
npm run build
npm start
```
