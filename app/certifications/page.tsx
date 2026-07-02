import { requirePermission } from "@/lib/auth";
import { listCertifications } from "@/lib/data";
import { getActiveVendor } from "@/lib/vendor";
import { Badge, Card, CertExpiryBadge, Empty, PartnerLink } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certifications" };

export default async function CertificationsPage() {
  await requirePermission("people.view");
  const vendor = await getActiveVendor();
  const certs = listCertifications(vendor.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-xl font-bold">Certifications</h1>
        <span className="text-sm text-slate-500">— {vendor.name}</span>
      </div>
      <Card title={`All certifications (${certs.length}), soonest expiry first`}>
        {certs.length === 0 ? (
          <Empty>
            No certifications yet — add them on a person from a partner page.
          </Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4">Certification</th>
                <th className="py-2 pr-4">Level</th>
                <th className="py-2 pr-4">Holder</th>
                <th className="py-2 pr-4">Partner</th>
                <th className="py-2 pr-4">Expires</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-slate-100 ${c.person_status !== "Active" ? "opacity-50" : ""}`}
                >
                  <td className="py-2 pr-4 font-medium">{c.name}</td>
                  <td className="py-2 pr-4">{c.level || "—"}</td>
                  <td className="py-2 pr-4">
                    {c.person_name}{" "}
                    {c.person_status !== "Active" && <Badge value="Departed" />}
                  </td>
                  <td className="py-2 pr-4">
                    <PartnerLink id={c.partner_id} name={c.partner_name} />
                  </td>
                  <td className="py-2 pr-4">{c.expiry_date || "—"}</td>
                  <td className="py-2">
                    <CertExpiryBadge expiryDate={c.expiry_date} />
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
