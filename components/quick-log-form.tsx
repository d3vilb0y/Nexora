"use client";

import { useRef, useState, useTransition } from "react";
import { createEngagement } from "@/lib/actions";
import type { LogTarget } from "@/lib/data";
import { COMMON_TOPICS, ENGAGEMENT_TYPES } from "@/lib/types";
import { Field, btnCls, inputCls, labelCls } from "./ui";

function Chip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        selected
          ? "border-sky-600 bg-sky-600 text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-sky-400"
      }`}
    >
      {label}
    </button>
  );
}

export function QuickLogForm({ targets }: { targets: LogTarget[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [partnerIds, setPartnerIds] = useState<number[]>(
    targets.length === 1 ? [targets[0].id] : []
  );
  const [type, setType] = useState<string>("Visit");
  const [attendees, setAttendees] = useState<number[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");

  const selectedPartners = targets.filter((t) => partnerIds.includes(t.id));
  const attendeeOptions = selectedPartners.flatMap((t) =>
    t.people.map((p) => ({
      ...p,
      label:
        selectedPartners.length > 1
          ? `${p.name} (${t.name})`
          : `${p.name} (${p.role})`,
    }))
  );

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  function togglePartner(id: number) {
    const next = toggle(partnerIds, id);
    setPartnerIds(next);
    // Drop attendees that no longer belong to a selected partner.
    const validPeople = new Set(
      targets
        .filter((t) => next.includes(t.id))
        .flatMap((t) => t.people.map((p) => p.id))
    );
    setAttendees((current) => current.filter((id) => validPeople.has(id)));
  }

  // Submit via onSubmit rather than form action: React 19 auto-resets the
  // form after an action, which desyncs controlled inputs.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (partnerIds.length === 0) return;
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    formData.set(
      "topics",
      [...topics, customTopic.trim()].filter(Boolean).join(", ")
    );
    startTransition(async () => {
      await createEngagement(formData);
      const form = formRef.current;
      if (form) {
        (form.elements.namedItem("summary") as HTMLInputElement).value = "";
        (form.elements.namedItem("details") as HTMLTextAreaElement).value = "";
      }
      setAttendees([]);
      setTopics([]);
      setCustomTopic("");
      setSaved(true);
    });
  }

  if (targets.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Add a partner first, then you can log engagements here.
      </p>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="type" value={type} />
      {partnerIds.map((id) => (
        <input key={id} type="hidden" name="partner_id" value={id} />
      ))}
      {attendees.map((id) => (
        <input key={id} type="hidden" name="attendee" value={id} />
      ))}

      <div>
        <span className={labelCls}>
          Partner(s) — select several for joint sessions
        </span>
        <div className="flex flex-wrap gap-2">
          {targets.map((t) => (
            <Chip
              key={t.id}
              label={t.name}
              selected={partnerIds.includes(t.id)}
              onToggle={() => togglePartner(t.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <span className={labelCls}>What was it?</span>
        <div className="flex flex-wrap gap-2">
          {ENGAGEMENT_TYPES.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={type === t}
              onToggle={() => setType(t)}
            />
          ))}
        </div>
      </div>

      <div>
        <span className={labelCls}>
          Who attended?{" "}
          {partnerIds.length === 0 && (
            <span className="text-slate-400">(pick a partner first)</span>
          )}
          {partnerIds.length > 0 && attendeeOptions.length === 0 && (
            <span className="text-slate-400">
              (no active people for the selected partner{partnerIds.length > 1 ? "s" : ""})
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          {attendeeOptions.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              selected={attendees.includes(p.id)}
              onToggle={() => setAttendees(toggle(attendees, p.id))}
            />
          ))}
        </div>
      </div>

      <div>
        <span className={labelCls}>Topics covered</span>
        <div className="flex flex-wrap gap-2">
          {COMMON_TOPICS.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={topics.includes(t)}
              onToggle={() => setTopics(toggle(topics, t))}
            />
          ))}
        </div>
        <input
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          placeholder="Other topic…"
          className={`${inputCls} mt-2`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <input
            type="date"
            name="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={`${inputCls} py-2.5 text-base`}
          />
        </Field>
        <Field label="One-liner">
          <input
            name="summary"
            placeholder="e.g. Joint SSE training for three partners"
            className={`${inputCls} py-2.5 text-base`}
          />
        </Field>
      </div>

      <Field label="More details (optional)">
        <textarea
          name="details"
          rows={3}
          placeholder="Anything worth remembering — commitments, follow-ups, gossip…"
          className={`${inputCls} text-base`}
        />
      </Field>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || partnerIds.length === 0}
          className={`${btnCls} px-6 py-2.5 text-base disabled:opacity-50`}
        >
          {isPending ? "Saving…" : "Log it"}
        </button>
        {saved && (
          <span className="text-sm font-medium text-emerald-600">
            Logged ✓
          </span>
        )}
      </div>
    </form>
  );
}
