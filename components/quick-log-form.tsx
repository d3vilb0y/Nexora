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

  const [partnerId, setPartnerId] = useState<number>(targets[0]?.id ?? 0);
  const [type, setType] = useState<string>("Visit");
  const [attendees, setAttendees] = useState<number[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");

  const partner = targets.find((t) => t.id === partnerId);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  function submit(formData: FormData) {
    setSaved(false);
    formData.set(
      "topics",
      [...topics, customTopic.trim()].filter(Boolean).join(", ")
    );
    startTransition(async () => {
      await createEngagement(formData);
      formRef.current?.reset();
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
    <form ref={formRef} action={submit} className="space-y-5">
      <input type="hidden" name="partner_id" value={partnerId} />
      <input type="hidden" name="type" value={type} />
      {attendees.map((id) => (
        <input key={id} type="hidden" name="attendee" value={id} />
      ))}

      <Field label="Partner">
        <select
          value={partnerId}
          onChange={(e) => {
            setPartnerId(Number(e.target.value));
            setAttendees([]);
          }}
          className={`${inputCls} py-2.5 text-base`}
        >
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

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
          Who attended? {partner && partner.people.length === 0 && (
            <span className="text-slate-400">
              (no active people for this partner yet)
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          {partner?.people.map((p) => (
            <Chip
              key={p.id}
              label={`${p.name} (${p.role})`}
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
            placeholder="e.g. Lunch at their office, talked H2 pipeline"
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
          disabled={isPending}
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
