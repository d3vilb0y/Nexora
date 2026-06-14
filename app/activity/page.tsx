import { listActivity, type ActivityEvent } from "@/lib/data";
import { getActiveVendor } from "@/lib/vendor";
import { Card, Empty, PartnerLink } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity" };

const KIND_LABEL: Record<ActivityEvent["kind"], string> = {
  engagement: "Engagement",
  cert: "Certification",
  departure: "Departure",
  partner: "Partner",
  deal: "Deal",
};

const KIND_COLOR: Record<ActivityEvent["kind"], string> = {
  engagement: "bg-teal-100 text-teal-800",
  cert: "bg-cyan-100 text-cyan-800",
  departure: "bg-rose-100 text-rose-800",
  partner: "bg-sky-100 text-sky-800",
  deal: "bg-emerald-100 text-emerald-800",
};

export default async function ActivityPage() {
  const vendor = await getActiveVendor();
  const events = listActivity(vendor.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-xl font-bold">Activity</h1>
        <span className="text-sm text-slate-500">
          recent changes across the {vendor.name} landscape
        </span>
      </div>

      <Card title="Recent activity">
        {events.length === 0 ? (
          <Empty>Nothing logged yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {events.map((e, i) => (
              <li
                key={`${e.kind}-${i}`}
                className="flex flex-wrap items-baseline gap-2 text-sm"
              >
                <span className="w-24 shrink-0 text-xs text-slate-400">
                  {e.date}
                </span>
                <span
                  className={`inline-block w-28 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium ${KIND_COLOR[e.kind]}`}
                >
                  {KIND_LABEL[e.kind]}
                </span>
                <span>
                  {e.text}
                  {e.partner_id && e.partner_name ? (
                    <>
                      {" — "}
                      <PartnerLink id={e.partner_id} name={e.partner_name} />
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
