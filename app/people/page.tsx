import { listPartners, listPeople } from "@/lib/data";
import { getActiveVendorId } from "@/lib/vendor";
import { PERSON_ROLES } from "@/lib/types";
import { Badge, Card, Empty, PartnerLink, btnCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "People" };

export default async function PeoplePage() {
  const vendorId = await getActiveVendorId();
  const people = listPeople(vendorId);
  const partners = listPartners(vendorId);
  const active = people.filter((p) => p.status === "Active");
  const departed = people.filter((p) => p.status !== "Active");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">People</h1>

      <Card title="Export contacts">
        <form
          action="/api/export/contacts"
          method="GET"
          className="space-y-4 text-sm"
        >
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Partners (none checked = all partners)
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {partners.map((p) => (
                <label key={p.id} className="flex items-center gap-1.5">
                  <input type="checkbox" name="partner" value={p.id} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500">Role:</span>
              {["All", ...PERSON_ROLES].map((r) => (
                <label key={r} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    defaultChecked={r === "All"}
                  />
                  {r}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="departed" value="1" />
              include departed
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" name="format" value="csv" className={btnCls}>
              Download CSV
            </button>
            <button
              type="submit"
              name="format"
              value="emails"
              formTarget="_blank"
              className="rounded-md border border-sky-600 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50"
            >
              Email list (copy-paste)
            </button>
          </div>
        </form>
      </Card>

      <Card title={`Active contacts (${active.length})`}>
        {active.length === 0 ? (
          <Empty>No people yet — add them from a partner page.</Empty>
        ) : (
          <PeopleTable rows={active} />
        )}
      </Card>

      <Card title={`Departed — churn & relationship leads (${departed.length})`}>
        {departed.length === 0 ? (
          <Empty>No tracked departures.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Left</th>
                <th className="py-2 pr-4">From</th>
                <th className="py-2 pr-4">Went to</th>
                <th className="py-2 pr-4">Certs</th>
                <th className="py-2">LinkedIn</th>
              </tr>
            </thead>
            <tbody>
              {departed.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">{p.name}</td>
                  <td className="py-2 pr-4">{p.departed_at || "—"}</td>
                  <td className="py-2 pr-4">
                    <PartnerLink id={p.eff_partner_id} name={p.partner_name} />
                  </td>
                  <td className="py-2 pr-4">{p.departed_to || "unknown"}</td>
                  <td className="py-2 pr-4">{p.cert_count}</td>
                  <td className="py-2">
                    {p.linkedin_url ? (
                      <a
                        href={p.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 hover:underline"
                      >
                        Profile
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function PeopleTable({
  rows,
}: {
  rows: ReturnType<typeof listPeople>;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs text-slate-500">
          <th className="py-2 pr-4">Name</th>
          <th className="py-2 pr-4">Role</th>
          <th className="py-2 pr-4">Partner</th>
          <th className="py-2 pr-4">Office</th>
          <th className="py-2 pr-4">Email</th>
          <th className="py-2 pr-4">Certs</th>
          <th className="py-2 pr-4">Last touch</th>
          <th className="py-2">LinkedIn</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} className="border-b border-slate-100">
            <td className="py-2 pr-4 font-medium">{p.name}</td>
            <td className="py-2 pr-4">
              <span className="flex items-center gap-1.5">
                <Badge value={p.role} />
                {p.company_wide === 1 && (
                  <span
                    className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                    title="Shared across every vendor this company works with"
                  >
                    shared
                  </span>
                )}
              </span>
            </td>
            <td className="py-2 pr-4">
              <PartnerLink id={p.eff_partner_id} name={p.partner_name} />
            </td>
            <td className="py-2 pr-4">{p.office_name || "—"}</td>
            <td className="py-2 pr-4">{p.email || "—"}</td>
            <td className="py-2 pr-4">{p.cert_count}</td>
            <td className="py-2 pr-4">{p.last_touch || "never"}</td>
            <td className="py-2">
              {p.linkedin_url ? (
                <a
                  href={p.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-700 hover:underline"
                >
                  Profile
                </a>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
