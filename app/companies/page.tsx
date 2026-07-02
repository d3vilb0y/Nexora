import { requirePermission } from "@/lib/auth";
import Link from "next/link";
import { listCompanies } from "@/lib/data";
import { formatMoney } from "@/lib/health";
import { Card, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  await requirePermission("partners.view");
  const companies = listCompanies();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-xl font-bold">Companies</h1>
        <span className="text-sm text-slate-500">
          the firms behind your partner records, across every vendor
        </span>
      </div>

      <Card title={`All companies (${companies.length})`}>
        {companies.length === 0 ? (
          <Empty>No companies yet — they appear as you add partners.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Vendor partnerships</th>
                <th className="py-2 pr-4">Shared contacts</th>
                <th className="py-2">Combined revenue</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/companies/${c.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    {c.partner_count > 1 ? (
                      <span className="font-medium">{c.partner_count}</span>
                    ) : (
                      c.partner_count
                    )}
                    {c.vendor_names ? (
                      <span className="text-slate-500"> · {c.vendor_names}</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4">{c.shared_people_count}</td>
                  <td className="py-2">{formatMoney(c.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
