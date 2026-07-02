import type { NextRequest } from "next/server";
import { checkApiPermission } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { listContactsForExport } from "@/lib/data";
import { getActiveVendorId } from "@/lib/vendor";

export async function GET(request: NextRequest) {
  const auth = await checkApiPermission("contacts.export");
  if ("status" in auth) {
    return Response.json(
      { error: auth.status === 401 ? "Not signed in." : "Missing permission: contacts.export" },
      { status: auth.status }
    );
  }
  const params = request.nextUrl.searchParams;
  const partnerIds = params
    .getAll("partner")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const role = params.get("role") || "All";
  const includeDeparted = params.get("departed") === "1";
  const format = params.get("format") === "emails" ? "emails" : "csv";
  const vendorId = await getActiveVendorId();

  const contacts = listContactsForExport({
    vendorId,
    partnerIds,
    role,
    includeDeparted,
  });

  if (format === "emails") {
    const lines = contacts
      .filter((c) => c.email)
      .map((c) => `${c.name} <${c.email}>`);
    return new Response(lines.join("\n") || "No contacts with email matched.", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const csv = toCsv(
    ["Name", "Role", "Title", "Email", "Phone", "Partner", "Office", "LinkedIn", "Status"],
    contacts.map((c) => [
      c.name,
      c.role,
      c.title,
      c.email,
      c.phone,
      c.partner_name,
      c.office_name ?? "",
      c.linkedin_url,
      c.status,
    ])
  );
  const date = new Date().toISOString().slice(0, 10);
  // BOM so Excel detects UTF-8 (names like Björn survive).
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nexora-contacts-${date}.csv"`,
    },
  });
}
