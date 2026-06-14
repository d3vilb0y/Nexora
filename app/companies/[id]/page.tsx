import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/lib/data";
import { formatMoney } from "@/lib/health";
import { Badge, Card, Empty, PartnerLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: getCompanyDetail(Number(id))?.company.name ?? "Company not found",
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = getCompanyDetail(Number(id));
  if (!detail) notFound();

  const { company, partners, sharedPeople, totalRevenue } = detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">{company.name}</h1>
        <span className="text-sm text-slate-500">
          {partners.length} vendor{partners.length === 1 ? "" : "s"} · combined
          revenue {formatMoney(totalRevenue)}
        </span>
      </div>

      <Card title="Vendor partnerships">
        {partners.length === 0 ? (
          <Empty>No partner records for this company.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4">Vendor</th>
                <th className="py-2 pr-4">Partner record</th>
                <th className="py-2 pr-4">Tier</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Region</th>
                <th className="py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">{p.vendor_name}</td>
                  <td className="py-2 pr-4">
                    <PartnerLink id={p.id} name={p.name} />
                  </td>
                  <td className="py-2 pr-4">
                    <Badge value={p.tier} />
                  </td>
                  <td className="py-2 pr-4">
                    <Badge value={p.status} />
                  </td>
                  <td className="py-2 pr-4">{p.region || "—"}</td>
                  <td className="py-2">{formatMoney(p.annual_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Shared contacts (Sales & Management)">
        {sharedPeople.length === 0 ? (
          <Empty>
            No company-wide contacts. Sales &amp; Management people added on any
            of this company&rsquo;s partner pages appear here and under every
            vendor it works with.
          </Empty>
        ) : (
          <ul className="space-y-2">
            {sharedPeople.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{p.name}</span>
                <Badge value={p.role} />
                {p.status === "Departed" && <Badge value="Departed" />}
                {p.title && <span className="text-slate-500">{p.title}</span>}
                {p.email && (
                  <a
                    href={`mailto:${p.email}`}
                    className="text-sky-700 hover:underline"
                  >
                    {p.email}
                  </a>
                )}
                {p.linkedin_url && (
                  <a
                    href={p.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-700 hover:underline"
                  >
                    LinkedIn
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Link href="/companies" className="text-sm text-sky-700 hover:underline">
        ← All companies
      </Link>
    </div>
  );
}
