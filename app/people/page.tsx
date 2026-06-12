import { listPeople } from "@/lib/data";
import { Badge, Card, Empty, PartnerLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function PeoplePage() {
  const people = listPeople();
  const active = people.filter((p) => p.status === "Active");
  const departed = people.filter((p) => p.status !== "Active");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">People</h1>

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
                    <PartnerLink id={p.partner_id} name={p.partner_name} />
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
              <Badge value={p.role} />
            </td>
            <td className="py-2 pr-4">
              <PartnerLink id={p.partner_id} name={p.partner_name} />
            </td>
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
