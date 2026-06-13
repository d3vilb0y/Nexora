import { cookies } from "next/headers";
import { getDb } from "./db";
import type { Vendor } from "./types";

/** Cookie holding the id of the vendor (tillverkare) currently in focus. */
export const VENDOR_COOKIE = "nexora_vendor";

export function listVendors(): Vendor[] {
  return getDb()
    .prepare("SELECT * FROM vendors ORDER BY status, name COLLATE NOCASE")
    .all() as Vendor[];
}

export function getVendor(id: number): Vendor | undefined {
  return getDb()
    .prepare("SELECT * FROM vendors WHERE id = ?")
    .get(id) as Vendor | undefined;
}

export type VendorStats = Vendor & {
  partner_count: number;
  people_count: number;
};

export function listVendorsWithStats(): VendorStats[] {
  return getDb()
    .prepare(
      `SELECT v.*,
        (SELECT COUNT(*) FROM partners pa WHERE pa.vendor_id = v.id) AS partner_count,
        (SELECT COUNT(*) FROM people pe
           JOIN partners pa ON pa.id = pe.partner_id
           WHERE pa.vendor_id = v.id) AS people_count
       FROM vendors v
       ORDER BY v.status, v.name COLLATE NOCASE`
    )
    .all() as VendorStats[];
}

/**
 * The vendor the current request is scoped to: the one named in the cookie if
 * it still exists, otherwise the first vendor. There is always at least one
 * vendor (the migration guarantees it), so this never returns 0 in practice.
 */
export async function getActiveVendorId(): Promise<number> {
  const vendors = listVendors();
  if (vendors.length === 0) return 0;
  const raw = (await cookies()).get(VENDOR_COOKIE)?.value;
  const id = raw ? Number(raw) : NaN;
  if (Number.isInteger(id) && vendors.some((v) => v.id === id)) return id;
  return vendors[0].id;
}

export async function getActiveVendor(): Promise<Vendor> {
  const id = await getActiveVendorId();
  const vendors = listVendors();
  return vendors.find((v) => v.id === id) ?? vendors[0];
}
