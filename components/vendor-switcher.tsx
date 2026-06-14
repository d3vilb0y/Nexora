"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { setActiveVendor } from "@/lib/actions";
import type { Vendor } from "@/lib/types";

/**
 * The brand/tillverkare picker that lives in the header. Changing the selection
 * submits immediately, re-scoping the whole CRM to that vendor's landscape.
 */
export function VendorSwitcher({
  vendors,
  activeId,
}: {
  vendors: Vendor[];
  activeId: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  // So the action can redirect back here: the post-action re-render reads the
  // old request cookie, so we round-trip through a fresh request instead.
  const pathname = usePathname();

  return (
    <form ref={formRef} action={setActiveVendor} className="flex items-center gap-1.5">
      <input type="hidden" name="return_to" value={pathname} />
      <label className="text-xs font-medium text-slate-400" htmlFor="vendor-switch">
        Vendor
      </label>
      <select
        id="vendor-switch"
        name="vendor_id"
        defaultValue={activeId}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium focus:border-sky-500 focus:outline-none"
      >
        {vendors.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
            {v.status !== "Active" ? " (archived)" : ""}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-xs text-sky-700 hover:underline">
          Switch
        </button>
      </noscript>
    </form>
  );
}
