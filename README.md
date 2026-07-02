# Nexora — Partner CRM

A lightweight CRM for managing channel partners: the companies, their sales
and technical people, certification levels and expiry dates, engagement
history, MDF budgets, NFR licenses, joint business plans, needs and problems —
with a health score and tier gap analysis on top.

It is **multi-vendor**: run partner programs for several manufacturers
(tillverkare) — F5, Citrix, Check Point, Zscaler… — side by side and switch
between their partner landscapes with one click.

## Features

- **Multi-vendor (tillverkare)** — every partner, person, certification, deal
  and program tier belongs to a vendor. A picker in the header switches which
  vendor&rsquo;s landscape the whole CRM is scoped to, and the **Admin** page is
  where vendors are configured (name, description, a certification catalog that
  suggests cert names, and active/archived status). Each vendor gets its own
  Authorized / Silver / Gold tier ladder. Deleting a vendor removes its whole
  landscape; the last vendor can&rsquo;t be deleted.
- **Partners** — tier (Authorized / Silver / Gold), status, region, revenue, notes.
- **Personnel** — sales & technical contacts per partner with LinkedIn profiles,
  shown as compact expandable rows, plus **churn tracking**: mark a person
  departed, record where they went, and see how that affects the partner's tier.
- **Offices/regions** — partners can have several sales offices; people are
  assignable to one.
- **Contact export** — CSV download or copy-paste email list, filtered by
  role (all/sales/technical/…) across any selection of partners.
- **Certifications with expiry alerts** — "Anna's ZIA cert expires in 60 days"
  reminders on the dashboard (90-day window), since tier status often depends
  on keeping N people certified. Certs held by departed people stop counting.
- **Tier gap analysis** — per-tier requirements (cert count, revenue) are
  editable on the Tiers page (per vendor); each partner page shows what's
  missing to maintain the current tier or advance to the next one, and the
  dashboard flags tiers at risk.
- **Engagement history** — quick mobile-friendly logger (visits, lunches,
  QBRs…) with attendees and topic chips; an engagement can span several
  partners at once (e.g. a joint training); partners with no touchpoint in
  60+ days surface as "gone quiet".
- **Deals** — register deals partners bring us into, with our support noted
  and a stage workflow; **Salesforce import** via report CSV upload or direct
  REST API sync, deduped on opportunity ID. The API sync authenticates with an
  auto-refreshing OAuth connected app (`SF_CLIENT_ID` + `SF_CLIENT_SECRET`,
  optionally `SF_REFRESH_TOKEN`); a static `SF_ACCESS_TOKEN` is also accepted
  for quick tests. Tokens are cached and re-issued automatically on expiry.
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

## Authentication & access control

Sign-in is **OIDC single sign-on** (any spec-compliant IdP: Entra ID, Okta,
Keycloak, Auth0, Google, …) with **role-based access control** managed in the
GUI under **Admin → Access**: roles bundle granular permissions (view/manage
per area, deal import, contact export, vendor & access administration) and are
assigned per user. Users appear after their first sign-in, or can be
pre-provisioned by email. Pages, server actions **and** API routes all enforce
the same permissions; the contacts-export API returns 401/403 accordingly.

Configure via environment:

| Variable | Meaning |
| --- | --- |
| `OIDC_ISSUER` | Issuer URL, e.g. `https://login.example.com/realms/acme` |
| `OIDC_CLIENT_ID` | Client id registered at the IdP |
| `OIDC_CLIENT_SECRET` | Client secret (omit for public clients — PKCE is always used) |
| `OIDC_SCOPES` | Optional, defaults to `openid profile email` |
| `NEXORA_APP_URL` | Public base URL; redirect URI is `<APP_URL>/api/auth/callback` |
| `NEXORA_ADMIN_EMAIL` | Bootstrap admin: this email gets the built-in Admin role on boot |
| `NEXORA_AUTH_DISABLED` | `1` = skip auth entirely (local development only) |

The HTTP API is described by an **OpenAPI 3.1 spec** at
[`openapi.yaml`](./openapi.yaml), also served to signed-in users at
`/api/openapi`. Each endpoint documents the permission it requires via the
`x-required-permission` extension.

Register the redirect URI `https://your-host/api/auth/callback` (and, for
RP-initiated logout, the post-logout URI `https://your-host/login`) at the IdP.
The IdP must release the `email` claim. The built-in **Admin** role always
grants every permission and can't be edited; safety rails prevent deleting or
demoting the last account that can manage access.

## Production

```bash
npm run build
npm start
```
