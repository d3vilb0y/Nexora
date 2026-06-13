import {
  createVendor,
  deleteVendor,
  setActiveVendor,
  updateVendor,
} from "@/lib/actions";
import { getActiveVendorId, listVendorsWithStats } from "@/lib/vendor";
import { VENDOR_STATUSES } from "@/lib/types";
import {
  Badge,
  Card,
  Empty,
  Field,
  btnCls,
  btnDangerCls,
  inputCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const vendors = listVendorsWithStats();
  const activeId = await getActiveVendorId();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Admin — vendors</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure the manufacturers (tillverkare) you run partner programs
          for — F5, Citrix, Check Point, and so on. Each vendor has its own
          partners, people, certifications, deals and program tiers; the picker
          in the header switches which landscape you&rsquo;re looking at.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <Card title="Configured vendors">
        {vendors.length === 0 ? (
          <Empty>No vendors yet — add one below.</Empty>
        ) : (
          <div className="space-y-4">
            {vendors.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{v.name}</span>
                  <Badge value={v.status} />
                  {v.id === activeId ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                      in focus
                    </span>
                  ) : (
                    <form action={setActiveVendor}>
                      <input type="hidden" name="vendor_id" value={v.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-sky-700 hover:underline"
                      >
                        Switch to this vendor
                      </button>
                    </form>
                  )}
                  <span className="ml-auto text-xs text-slate-400">
                    {v.partner_count} partner{v.partner_count === 1 ? "" : "s"} ·{" "}
                    {v.people_count} {v.people_count === 1 ? "person" : "people"}
                  </span>
                </div>

                <form
                  action={updateVendor}
                  className="grid gap-3 md:grid-cols-2"
                >
                  <input type="hidden" name="id" value={v.id} />
                  <Field label="Name *">
                    <input
                      name="name"
                      required
                      defaultValue={v.name}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      name="status"
                      defaultValue={v.status}
                      className={inputCls}
                    >
                      {VENDOR_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Description">
                      <input
                        name="description"
                        defaultValue={v.description}
                        className={inputCls}
                        placeholder="e.g. Application security & delivery"
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Certification catalog (comma-separated — suggested when adding certs)">
                      <textarea
                        name="cert_catalog"
                        rows={2}
                        defaultValue={v.cert_catalog}
                        className={inputCls}
                        placeholder="e.g. 201, 202, 301, 302, 303, 304, 401, 402, XC Accreditation"
                      />
                    </Field>
                  </div>
                  <div className="flex items-center gap-4 md:col-span-2">
                    <button type="submit" className={btnCls}>
                      Save
                    </button>
                  </div>
                </form>

                <form
                  action={deleteVendor}
                  className="mt-3 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="id" value={v.id} />
                  <button type="submit" className={btnDangerCls}>
                    Delete vendor and all {v.partner_count} partner
                    {v.partner_count === 1 ? "" : "s"} + their data
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Add a vendor">
        <form action={createVendor} className="grid gap-4 md:grid-cols-2">
          <Field label="Name *">
            <input
              name="name"
              required
              className={inputCls}
              placeholder="e.g. Check Point"
            />
          </Field>
          <Field label="Status">
            <select name="status" className={inputCls}>
              {VENDOR_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <input
                name="description"
                className={inputCls}
                placeholder="What this vendor sells"
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Certification catalog (optional, comma-separated)">
              <textarea
                name="cert_catalog"
                rows={2}
                className={inputCls}
                placeholder="e.g. CCSA, CCSE, CCSM"
              />
            </Field>
          </div>
          <div>
            <button type="submit" className={btnCls}>
              Add vendor
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          New vendors start with the standard Authorized / Silver / Gold tier
          ladder — tune the requirements on the{" "}
          <span className="font-medium">Tiers</span> page.
        </p>
      </Card>
    </div>
  );
}
