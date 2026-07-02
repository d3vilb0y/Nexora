import { requirePermission } from "@/lib/auth";
import Link from "next/link";
import { search } from "@/lib/data";
import { getActiveVendor } from "@/lib/vendor";
import { formatMoney } from "@/lib/health";
import { Badge, Card, Empty, PartnerLink, inputCls, btnCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requirePermission("search.use");
  const vendor = await getActiveVendor();
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const results = search(vendor.id, q);
  const total =
    results.partners.length +
    results.people.length +
    results.deals.length +
    results.companies.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-xl font-bold">Search</h1>
        <span className="text-sm text-slate-500">
          partners, people &amp; deals in {vendor.name}; companies across all
          vendors
        </span>
      </div>

      <form action="/search" method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Search by name, email, customer…"
          className={inputCls}
        />
        <button type="submit" className={btnCls}>
          Search
        </button>
      </form>

      {q === "" ? (
        <Empty>Type something above to search.</Empty>
      ) : total === 0 ? (
        <Empty>No matches for &ldquo;{q}&rdquo;.</Empty>
      ) : (
        <div className="space-y-6">
          {results.partners.length > 0 && (
            <Card title={`Partners (${results.partners.length})`}>
              <ul className="space-y-2">
                {results.partners.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <PartnerLink id={p.id} name={p.name} />
                    <Badge value={p.tier} />
                    <Badge value={p.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {results.people.length > 0 && (
            <Card title={`People (${results.people.length})`}>
              <ul className="space-y-2">
                {results.people.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <Badge value={p.role} />
                    {p.title && <span className="text-slate-500">{p.title}</span>}
                    <span className="text-slate-400">at</span>
                    <PartnerLink id={p.eff_partner_id} name={p.partner_name} />
                    {p.email && (
                      <a
                        href={`mailto:${p.email}`}
                        className="text-sky-700 hover:underline"
                      >
                        {p.email}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {results.companies.length > 0 && (
            <Card title={`Companies (${results.companies.length})`}>
              <ul className="space-y-2">
                {results.companies.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <Link
                      href={`/companies/${c.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.vendor_names && (
                      <span className="text-slate-500">· {c.vendor_names}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {results.deals.length > 0 && (
            <Card title={`Deals (${results.deals.length})`}>
              <ul className="space-y-2">
                {results.deals.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge value={d.stage} />
                    <span className="font-medium">{d.customer}</span>
                    {d.title && <span className="text-slate-500">{d.title}</span>}
                    <span className="text-slate-400">{formatMoney(d.value)}</span>
                    <span className="text-slate-400">via</span>
                    <PartnerLink id={d.partner_id} name={d.partner_name} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
