import { listLogTargets, listRecentEngagements } from "@/lib/data";
import { Badge, Card, Empty, PartnerLink } from "@/components/ui";
import { QuickLogForm } from "@/components/quick-log-form";

export const dynamic = "force-dynamic";

export default function LogPage() {
  const targets = listLogTargets();
  const recent = listRecentEngagements(25);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Log an engagement</h1>

      <Card title="Quick log">
        <QuickLogForm targets={targets} />
      </Card>

      <Card title="Recent activity">
        {recent.length === 0 ? (
          <Empty>Nothing logged yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {recent.map((e) => (
              <li key={e.id} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="whitespace-nowrap text-slate-400">
                    {e.date}
                  </span>
                  <Badge value={e.type} />
                  <PartnerLink id={e.partner_id} name={e.partner_name} />
                  {(() => {
                    const co = (e.partner_names ?? "")
                      .split(", ")
                      .filter((n) => n && n !== e.partner_name);
                    return co.length > 0 ? (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                        joint with {co.join(", ")}
                      </span>
                    ) : null;
                  })()}
                  {e.attendees && (
                    <span className="text-slate-500">with {e.attendees}</span>
                  )}
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
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
