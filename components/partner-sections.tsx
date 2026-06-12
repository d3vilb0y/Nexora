import Link from "next/link";
import type { PartnerDetail } from "@/lib/data";
import {
  createCertification,
  createCompetitor,
  createDeal,
  createEngagement,
  createGoal,
  createLicense,
  createMdfEntry,
  createNeed,
  createOffice,
  createPerson,
  createProblem,
  deleteCertification,
  deleteCompetitor,
  deleteDeal,
  deleteEngagement,
  deleteGoal,
  deleteLicense,
  deleteMdfEntry,
  deleteNeed,
  deleteOffice,
  deletePerson,
  deleteProblem,
  markPersonDeparted,
  reactivatePerson,
  setPersonOffice,
  updateDealStage,
  updateGoalProgress,
  updateNeedStatus,
  updateProblemStatus,
} from "@/lib/actions";
import { formatMoney } from "@/lib/health";
import {
  DEAL_STAGES,
  ENGAGEMENT_TYPES,
  LICENSE_KINDS,
  MDF_KINDS,
  NEED_STATUSES,
  PERSON_ROLES,
  PRIORITIES,
  PROBLEM_STATUSES,
  SEVERITIES,
} from "@/lib/types";
import {
  Badge,
  Card,
  CertExpiryBadge,
  Empty,
  Field,
  btnCls,
  btnDangerCls,
  inputCls,
} from "./ui";

function AddForm({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="mt-3 rounded-md border border-dashed border-slate-300 px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-sky-700">
        {label}
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

/** Borderless variant for use inside already-bordered containers. */
function AddFormInline({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="min-w-0 grow">
      <summary className="cursor-pointer text-xs font-medium text-sky-700">
        {label}
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

function HiddenIds({
  partnerId,
  id,
}: {
  partnerId: number;
  id?: number;
}) {
  return (
    <>
      <input type="hidden" name="partner_id" value={partnerId} />
      {id !== undefined && <input type="hidden" name="id" value={id} />}
    </>
  );
}

function DeleteButton({ label = "Delete" }: { label?: string }) {
  return (
    <button type="submit" className={btnDangerCls}>
      {label}
    </button>
  );
}

// --- Offices ---

export function OfficesSection({ detail }: { detail: PartnerDetail }) {
  const { partner, offices } = detail;
  return (
    <Card title="Offices / regions">
      {offices.length === 0 ? (
        <Empty>No separate offices — single-location partner.</Empty>
      ) : (
        <ul className="space-y-2">
          {offices.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{o.name}</span>
              {o.region && <Badge value={o.region} />}
              {o.address && <span className="text-slate-500">{o.address}</span>}
              {o.phone && <span className="text-slate-400">{o.phone}</span>}
              <span className="text-xs text-slate-400">
                {o.people_count} active{" "}
                {o.people_count === 1 ? "person" : "people"}
              </span>
              <form action={deleteOffice} className="ml-auto">
                <HiddenIds partnerId={partner.id} id={o.id} />
                <DeleteButton label="Remove" />
              </form>
            </li>
          ))}
        </ul>
      )}
      <AddForm label="Add office">
        <form action={createOffice} className="grid gap-3 md:grid-cols-4">
          <HiddenIds partnerId={partner.id} />
          <Field label="Office name *">
            <input
              name="name"
              required
              className={inputCls}
              placeholder="e.g. Stockholm HQ"
            />
          </Field>
          <Field label="Region">
            <input name="region" className={inputCls} placeholder="e.g. Nordics" />
          </Field>
          <Field label="Address">
            <input name="address" className={inputCls} />
          </Field>
          <Field label="Phone">
            <input name="phone" className={inputCls} />
          </Field>
          <div className="md:col-span-4">
            <button type="submit" className={btnCls}>
              Add office
            </button>
          </div>
        </form>
      </AddForm>
    </Card>
  );
}

// --- People & certifications ---

function PersonRow({
  detail,
  person,
}: {
  detail: PartnerDetail;
  person: PartnerDetail["people"][number];
}) {
  const { partner, offices } = detail;
  const soonest = person.certifications
    .filter((c) => c.expiry_date)
    .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))[0];

  return (
    <details
      className={`group rounded-lg border ${person.status === "Departed" ? "border-rose-200 bg-rose-50/40" : "border-slate-200"}`}
    >
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm">
        <span className="text-slate-400 transition-transform group-open:rotate-90">
          ▸
        </span>
        <span className="font-semibold">{person.name}</span>
        <Badge value={person.role} />
        {person.office_name && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {person.office_name}
          </span>
        )}
        {person.status === "Departed" && <Badge value="Departed" />}
        <span className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          {person.certifications.length} cert
          {person.certifications.length === 1 ? "" : "s"}
          {soonest && person.status === "Active" && (
            <CertExpiryBadge expiryDate={soonest.expiry_date} />
          )}
        </span>
      </summary>

      <div className="space-y-3 border-t border-slate-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          {person.title && <span>{person.title}</span>}
          {person.email && (
            <a href={`mailto:${person.email}`} className="text-sky-700 hover:underline">
              {person.email}
            </a>
          )}
          {person.phone && <span>{person.phone}</span>}
          {person.linkedin_url && (
            <a
              href={person.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 hover:underline"
            >
              LinkedIn
            </a>
          )}
          {person.status === "Departed" && (
            <span className="text-rose-600">
              left {person.departed_at || "?"}
              {person.departed_to ? ` → ${person.departed_to}` : ""}
            </span>
          )}
        </div>
        {person.notes && <p className="text-sm text-slate-500">{person.notes}</p>}

        {person.certifications.length === 0 ? (
          <p className="text-xs text-slate-400">No certifications.</p>
        ) : (
          <ul className="space-y-1">
            {person.certifications.map((cert) => (
              <li key={cert.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{cert.name}</span>
                {cert.level && <span className="text-slate-500">{cert.level}</span>}
                <CertExpiryBadge expiryDate={cert.expiry_date} />
                {cert.expiry_date && (
                  <span className="text-xs text-slate-400">
                    expires {cert.expiry_date}
                  </span>
                )}
                {person.status === "Departed" && (
                  <span className="text-xs text-rose-500">
                    (not counted — departed)
                  </span>
                )}
                <form action={deleteCertification} className="ml-auto">
                  <HiddenIds partnerId={partner.id} id={cert.id} />
                  <DeleteButton label="Remove" />
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-2">
          <AddFormInline label="Add certification">
            <form action={createCertification} className="grid gap-3 md:grid-cols-4">
              <HiddenIds partnerId={partner.id} />
              <input type="hidden" name="person_id" value={person.id} />
              <Field label="Certification *">
                <input name="name" required className={inputCls} placeholder="e.g. ZIA" />
              </Field>
              <Field label="Level">
                <input name="level" className={inputCls} placeholder="e.g. Professional" />
              </Field>
              <Field label="Issued">
                <input type="date" name="issued_date" className={inputCls} />
              </Field>
              <Field label="Expires">
                <input type="date" name="expiry_date" className={inputCls} />
              </Field>
              <div className="md:col-span-4">
                <button type="submit" className={btnCls}>
                  Add certification
                </button>
              </div>
            </form>
          </AddFormInline>
          {offices.length > 0 && person.status === "Active" && (
            <form action={setPersonOffice} className="flex items-center gap-1 text-xs">
              <HiddenIds partnerId={partner.id} id={person.id} />
              <select
                name="office_id"
                defaultValue={person.office_id ?? 0}
                className="rounded-md border border-slate-300 px-1 py-0.5 text-xs"
              >
                <option value={0}>— no office —</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="text-sky-700 hover:underline">
                Set office
              </button>
            </form>
          )}
          <span className="ml-auto flex items-center gap-2">
            {person.status === "Active" ? (
              <details className="relative">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-rose-600">
                  Mark departed
                </summary>
                <form
                  action={markPersonDeparted}
                  className="absolute right-0 z-10 mt-1 w-64 space-y-2 rounded-md border border-slate-200 bg-white p-3 shadow-lg"
                >
                  <HiddenIds partnerId={partner.id} id={person.id} />
                  <Field label="Departure date">
                    <input type="date" name="departed_at" className={inputCls} />
                  </Field>
                  <Field label="Went to (company)">
                    <input
                      name="departed_to"
                      className={inputCls}
                      placeholder="New employer"
                    />
                  </Field>
                  <button type="submit" className={btnCls}>
                    Confirm departure
                  </button>
                </form>
              </details>
            ) : (
              <form action={reactivatePerson}>
                <HiddenIds partnerId={partner.id} id={person.id} />
                <button
                  type="submit"
                  className="text-xs text-slate-500 hover:text-emerald-600"
                >
                  Reactivate
                </button>
              </form>
            )}
            <form action={deletePerson}>
              <HiddenIds partnerId={partner.id} id={person.id} />
              <DeleteButton />
            </form>
          </span>
        </div>
      </div>
    </details>
  );
}

export function PeopleSection({ detail }: { detail: PartnerDetail }) {
  const { partner, people, offices } = detail;
  return (
    <Card title="Personnel & certifications">
      {people.length === 0 ? (
        <Empty>No people tracked yet.</Empty>
      ) : (
        <div className="space-y-2">
          {people.map((person) => (
            <PersonRow key={person.id} detail={detail} person={person} />
          ))}
        </div>
      )}

      <AddForm label="Add person">
        <form action={createPerson} className="grid gap-3 md:grid-cols-3">
          <HiddenIds partnerId={partner.id} />
          <Field label="Name *">
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="Role">
            <select name="role" className={inputCls}>
              {PERSON_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Office">
            <select name="office_id" className={inputCls}>
              <option value={0}>— no office —</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title">
            <input name="title" className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" name="email" className={inputCls} />
          </Field>
          <Field label="Phone">
            <input name="phone" className={inputCls} />
          </Field>
          <Field label="LinkedIn URL">
            <input
              name="linkedin_url"
              className={inputCls}
              placeholder="https://linkedin.com/in/…"
            />
          </Field>
          <div className="md:col-span-3">
            <Field label="Notes">
              <textarea name="notes" rows={2} className={inputCls} />
            </Field>
          </div>
          <div>
            <button type="submit" className={btnCls}>
              Add person
            </button>
          </div>
        </form>
      </AddForm>
    </Card>
  );
}

// --- Engagements ---

export function EngagementsSection({ detail }: { detail: PartnerDetail }) {
  const { partner, engagements, people } = detail;
  const activePeople = people.filter((p) => p.status === "Active");
  return (
    <Card
      title="Engagement history"
      action={
        <Link href="/log" className="text-xs font-medium text-sky-700 hover:underline">
          Quick log →
        </Link>
      }
    >
      {engagements.length === 0 ? (
        <Empty>No touchpoints logged — this partner counts as quiet.</Empty>
      ) : (
        <ul className="space-y-3">
          {engagements.map((e) => {
            const coPartners = (e.partner_names ?? "")
              .split(", ")
              .filter((n) => n && n !== partner.name);
            return (
            <li key={e.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="whitespace-nowrap text-slate-400">
                  {e.date}
                </span>
                <Badge value={e.type} />
                {coPartners.length > 0 && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                    joint with {coPartners.join(", ")}
                  </span>
                )}
                {e.attendees && (
                  <span className="text-slate-500">with {e.attendees}</span>
                )}
                <form action={deleteEngagement} className="ml-auto">
                  <HiddenIds partnerId={partner.id} id={e.id} />
                  <DeleteButton label="Remove" />
                </form>
              </div>
              {(e.summary || e.topics) && (
                <div className="mt-1 flex flex-wrap items-center gap-2 pl-1">
                  {e.topics &&
                    e.topics.split(",").map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {t.trim()}
                      </span>
                    ))}
                  {e.summary && (
                    <span className="text-slate-600">{e.summary}</span>
                  )}
                </div>
              )}
              {e.details && (
                <p className="mt-1 pl-1 text-xs text-slate-400">{e.details}</p>
              )}
            </li>
            );
          })}
        </ul>
      )}
      <AddForm label="Log touchpoint">
        <form action={createEngagement} className="grid gap-3 md:grid-cols-3">
          <HiddenIds partnerId={partner.id} />
          <Field label="Type">
            <select name="type" className={inputCls}>
              {ENGAGEMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" name="date" className={inputCls} />
          </Field>
          <Field label="Topics (comma separated)">
            <input
              name="topics"
              className={inputCls}
              placeholder="Pipeline, Roadmap"
            />
          </Field>
          <div className="md:col-span-3">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Attendees
            </span>
            <div className="flex flex-wrap gap-3">
              {activePeople.length === 0 && (
                <span className="text-xs text-slate-400">
                  No active people yet.
                </span>
              )}
              {activePeople.map((p) => (
                <label key={p.id} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="attendee" value={p.id} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            <Field label="Summary">
              <input
                name="summary"
                className={inputCls}
                placeholder="What happened?"
              />
            </Field>
          </div>
          <div className="md:col-span-3">
            <Field label="More details">
              <textarea name="details" rows={2} className={inputCls} />
            </Field>
          </div>
          <div>
            <button type="submit" className={btnCls}>
              Log touchpoint
            </button>
          </div>
        </form>
      </AddForm>
    </Card>
  );
}

// --- Deals ---

export function DealsSection({ detail }: { detail: PartnerDetail }) {
  const { partner, deals } = detail;
  return (
    <Card
      title="Deals we're supporting"
      action={
        <Link
          href="/deals"
          className="text-xs font-medium text-sky-700 hover:underline"
        >
          All deals →
        </Link>
      }
    >
      {deals.length === 0 ? (
        <Empty>No deals registered with this partner.</Empty>
      ) : (
        <ul className="space-y-2">
          {deals.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge value={d.stage} />
              <span className="font-medium">{d.customer}</span>
              {d.title && <span className="text-slate-500">{d.title}</span>}
              <span className="text-slate-500">{formatMoney(d.value)}</span>
              {d.support_provided && (
                <span className="text-xs text-slate-400">
                  our help: {d.support_provided}
                </span>
              )}
              <span className="ml-auto flex items-center gap-2">
                <form
                  action={updateDealStage}
                  className="flex items-center gap-1"
                >
                  <HiddenIds partnerId={partner.id} id={d.id} />
                  <select
                    name="stage"
                    defaultValue={d.stage}
                    className="rounded-md border border-slate-300 px-1 py-0.5 text-xs"
                  >
                    {DEAL_STAGES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="text-xs text-sky-700 hover:underline"
                  >
                    Set
                  </button>
                </form>
                <form action={deleteDeal}>
                  <HiddenIds partnerId={partner.id} id={d.id} />
                  <DeleteButton label="Remove" />
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
      <AddForm label="Register deal">
        <form action={createDeal} className="grid gap-3 md:grid-cols-4">
          <HiddenIds partnerId={partner.id} />
          <Field label="End customer *">
            <input name="customer" required className={inputCls} />
          </Field>
          <Field label="Deal / opportunity">
            <input name="title" className={inputCls} />
          </Field>
          <Field label="Value (USD)">
            <input
              type="number"
              name="value"
              min="0"
              step="1000"
              className={inputCls}
            />
          </Field>
          <Field label="Our support">
            <input
              name="support_provided"
              className={inputCls}
              placeholder="e.g. joint demo, PoC help"
            />
          </Field>
          <div className="md:col-span-4">
            <button type="submit" className={btnCls}>
              Register deal
            </button>
          </div>
        </form>
      </AddForm>
    </Card>
  );
}

// --- MDF ---

export function MdfSection({ detail }: { detail: PartnerDetail }) {
  const { partner, mdfEntries, mdfBalance } = detail;
  return (
    <Card
      title="MDF / co-op funds"
      action={
        <span
          className={`text-sm font-semibold ${mdfBalance < 0 ? "text-rose-600" : "text-emerald-700"}`}
        >
          Balance: {formatMoney(mdfBalance)}
        </span>
      }
    >
      {mdfEntries.length === 0 ? (
        <Empty>No MDF allocations or spend recorded.</Empty>
      ) : (
        <ul className="space-y-2">
          {mdfEntries.map((e) => (
            <li key={e.id} className="flex items-baseline gap-2 text-sm">
              <span className="whitespace-nowrap text-slate-400">
                {e.entry_date}
              </span>
              <Badge value={e.kind} />
              <span
                className={`font-medium ${e.kind === "Usage" ? "text-rose-600" : "text-emerald-700"}`}
              >
                {e.kind === "Usage" ? "−" : "+"}
                {formatMoney(e.amount)}
              </span>
              <span className="text-slate-600">{e.description}</span>
              <form action={deleteMdfEntry} className="ml-auto">
                <HiddenIds partnerId={partner.id} id={e.id} />
                <DeleteButton label="Remove" />
              </form>
            </li>
          ))}
        </ul>
      )}
      <AddForm label="Add MDF entry">
        <form action={createMdfEntry} className="grid gap-3 md:grid-cols-4">
          <HiddenIds partnerId={partner.id} />
          <Field label="Kind">
            <select name="kind" className={inputCls}>
              {MDF_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" name="entry_date" className={inputCls} />
          </Field>
          <Field label="Amount (USD) *">
            <input
              type="number"
              name="amount"
              min="0"
              step="100"
              required
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <input
              name="description"
              className={inputCls}
              placeholder="e.g. Q3 event sponsorship"
            />
          </Field>
          <div className="md:col-span-4">
            <button type="submit" className={btnCls}>
              Add entry
            </button>
          </div>
        </form>
      </AddForm>
    </Card>
  );
}

// --- Licenses ---

export function LicensesSection({ detail }: { detail: PartnerDetail }) {
  const { partner, licenses } = detail;
  return (
    <Card title="NFR / lab licenses & demo gear">
      {licenses.length === 0 ? (
        <Empty>No licenses or demo gear tracked.</Empty>
      ) : (
        <ul className="space-y-2">
          {licenses.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{l.product}</span>
              <Badge value={l.kind} />
              {l.identifier && (
                <span className="text-xs text-slate-400">{l.identifier}</span>
              )}
              {l.expiry_date ? (
                <CertExpiryBadge expiryDate={l.expiry_date} />
              ) : (
                <span className="text-xs text-slate-400">no expiry</span>
              )}
              {l.notes && <span className="text-slate-500">{l.notes}</span>}
              <form action={deleteLicense} className="ml-auto">
                <HiddenIds partnerId={partner.id} id={l.id} />
                <DeleteButton label="Remove" />
              </form>
            </li>
          ))}
        </ul>
      )}
      <AddForm label="Add license / gear">
        <form action={createLicense} className="grid gap-3 md:grid-cols-4">
          <HiddenIds partnerId={partner.id} />
          <Field label="Product *">
            <input name="product" required className={inputCls} />
          </Field>
          <Field label="Kind">
            <select name="kind" className={inputCls}>
              {LICENSE_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Identifier / key">
            <input name="identifier" className={inputCls} />
          </Field>
          <Field label="Expires">
            <input type="date" name="expiry_date" className={inputCls} />
          </Field>
          <Field label="Issued">
            <input type="date" name="issued_date" className={inputCls} />
          </Field>
          <Field label="Notes">
            <input name="notes" className={inputCls} />
          </Field>
          <div className="md:col-span-4">
            <button type="submit" className={btnCls}>
              Add license
            </button>
          </div>
        </form>
      </AddForm>
    </Card>
  );
}

// --- Business goals ---

export function GoalsSection({ detail }: { detail: PartnerDetail }) {
  const { partner, goals } = detail;
  return (
    <Card title="Joint business plan">
      {goals.length === 0 ? (
        <Empty>No goals agreed yet.</Empty>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => (
            <li key={g.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  {g.year}
                </span>
                <span className="font-medium">{g.title}</span>
                {g.target && (
                  <span className="text-slate-500">target: {g.target}</span>
                )}
                <form
                  action={updateGoalProgress}
                  className="ml-auto flex items-center gap-1"
                >
                  <HiddenIds partnerId={partner.id} id={g.id} />
                  <input
                    type="number"
                    name="progress_pct"
                    min="0"
                    max="100"
                    defaultValue={g.progress_pct}
                    className="w-16 rounded-md border border-slate-300 px-1 py-0.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="text-xs text-sky-700 hover:underline"
                  >
                    Update %
                  </button>
                </form>
                <form action={deleteGoal}>
                  <HiddenIds partnerId={partner.id} id={g.id} />
                  <DeleteButton label="Remove" />
                </form>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${g.progress_pct >= 75 ? "bg-emerald-500" : g.progress_pct >= 40 ? "bg-amber-400" : "bg-rose-400"}`}
                  style={{ width: `${g.progress_pct}%` }}
                />
              </div>
              {g.notes && <p className="mt-1 text-slate-500">{g.notes}</p>}
            </li>
          ))}
        </ul>
      )}
      <AddForm label="Add goal">
        <form action={createGoal} className="grid gap-3 md:grid-cols-4">
          <HiddenIds partnerId={partner.id} />
          <Field label="Year">
            <input
              type="number"
              name="year"
              defaultValue={new Date().getFullYear()}
              className={inputCls}
            />
          </Field>
          <Field label="Goal *">
            <input
              name="title"
              required
              className={inputCls}
              placeholder="e.g. 10 new logos"
            />
          </Field>
          <Field label="Target">
            <input name="target" className={inputCls} placeholder="e.g. $250k" />
          </Field>
          <Field label="Progress %">
            <input
              type="number"
              name="progress_pct"
              min="0"
              max="100"
              defaultValue={0}
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-4">
            <button type="submit" className={btnCls}>
              Add goal
            </button>
          </div>
        </form>
      </AddForm>
    </Card>
  );
}

// --- Competitors ---

export function CompetitorsSection({ detail }: { detail: PartnerDetail }) {
  const { partner, competitors } = detail;
  return (
    <Card title="Competitive overlap">
      {competitors.length === 0 ? (
        <Empty>No competing vendors tracked — possibly exclusive.</Empty>
      ) : (
        <ul className="space-y-2">
          {competitors.map((c) => (
            <li key={c.id} className="flex items-baseline gap-2 text-sm">
              <span className="font-medium">{c.vendor}</span>
              {c.notes && <span className="text-slate-500">{c.notes}</span>}
              <form action={deleteCompetitor} className="ml-auto">
                <HiddenIds partnerId={partner.id} id={c.id} />
                <DeleteButton label="Remove" />
              </form>
            </li>
          ))}
        </ul>
      )}
      <AddForm label="Add competing vendor">
        <form action={createCompetitor} className="grid gap-3 md:grid-cols-3">
          <HiddenIds partnerId={partner.id} />
          <Field label="Vendor *">
            <input
              name="vendor"
              required
              className={inputCls}
              placeholder="e.g. Cloudflare"
            />
          </Field>
          <Field label="Notes">
            <input
              name="notes"
              className={inputCls}
              placeholder="e.g. primary SSE alternative they pitch"
            />
          </Field>
          <div className="self-end">
            <button type="submit" className={btnCls}>
              Add
            </button>
          </div>
        </form>
      </AddForm>
    </Card>
  );
}

// --- Needs ---

export function NeedsSection({ detail }: { detail: PartnerDetail }) {
  const { partner, needs } = detail;
  return (
    <Card title="Needs">
      {needs.length === 0 ? (
        <Empty>No needs recorded.</Empty>
      ) : (
        <ul className="space-y-2">
          {needs.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge value={n.priority} />
              <Badge value={n.status} />
              <span className="font-medium">{n.title}</span>
              {n.description && (
                <span className="text-slate-500">{n.description}</span>
              )}
              <span className="ml-auto flex items-center gap-2">
                <form action={updateNeedStatus} className="flex items-center gap-1">
                  <HiddenIds partnerId={partner.id} id={n.id} />
                  <select
                    name="status"
                    defaultValue={n.status}
                    className="rounded-md border border-slate-300 px-1 py-0.5 text-xs"
                  >
                    {NEED_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="text-xs text-sky-700 hover:underline"
                  >
                    Set
                  </button>
                </form>
                <form action={deleteNeed}>
                  <HiddenIds partnerId={partner.id} id={n.id} />
                  <DeleteButton label="Remove" />
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
      <AddForm label="Add need">
        <form action={createNeed} className="grid gap-3 md:grid-cols-4">
          <HiddenIds partnerId={partner.id} />
          <Field label="Need *">
            <input name="title" required className={inputCls} />
          </Field>
          <Field label="Priority">
            <select name="priority" className={inputCls} defaultValue="Medium">
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <input name="description" className={inputCls} />
            </Field>
          </div>
          <div className="md:col-span-4">
            <button type="submit" className={btnCls}>
              Add need
            </button>
          </div>
        </form>
      </AddForm>
    </Card>
  );
}

// --- Problems ---

export function ProblemsSection({ detail }: { detail: PartnerDetail }) {
  const { partner, problems } = detail;
  return (
    <Card title="Problems">
      {problems.length === 0 ? (
        <Empty>No problems recorded. 🎉</Empty>
      ) : (
        <ul className="space-y-2">
          {problems.map((pr) => (
            <li
              key={pr.id}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <Badge value={pr.severity} />
              <Badge value={pr.status} />
              <span className="font-medium">{pr.title}</span>
              {pr.description && (
                <span className="text-slate-500">{pr.description}</span>
              )}
              <span className="ml-auto flex items-center gap-2">
                <form
                  action={updateProblemStatus}
                  className="flex items-center gap-1"
                >
                  <HiddenIds partnerId={partner.id} id={pr.id} />
                  <select
                    name="status"
                    defaultValue={pr.status}
                    className="rounded-md border border-slate-300 px-1 py-0.5 text-xs"
                  >
                    {PROBLEM_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="text-xs text-sky-700 hover:underline"
                  >
                    Set
                  </button>
                </form>
                <form action={deleteProblem}>
                  <HiddenIds partnerId={partner.id} id={pr.id} />
                  <DeleteButton label="Remove" />
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
      <AddForm label="Add problem">
        <form action={createProblem} className="grid gap-3 md:grid-cols-4">
          <HiddenIds partnerId={partner.id} />
          <Field label="Problem *">
            <input name="title" required className={inputCls} />
          </Field>
          <Field label="Severity">
            <select name="severity" className={inputCls} defaultValue="Medium">
              {SEVERITIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <input name="description" className={inputCls} />
            </Field>
          </div>
          <div className="md:col-span-4">
            <button type="submit" className={btnCls}>
              Add problem
            </button>
          </div>
        </form>
      </AddForm>
    </Card>
  );
}
