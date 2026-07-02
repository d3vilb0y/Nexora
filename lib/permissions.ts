/**
 * The RBAC permission catalog. Permissions are static code-level capabilities;
 * roles (stored in the DB, managed in the GUI at /admin/access) bundle them and
 * users hold roles. Keep this file free of server-only imports — the admin GUI
 * renders the catalog directly.
 */
export type Permission = {
  key: string;
  label: string;
};

export type PermissionGroup = {
  label: string;
  permissions: Permission[];
};

/** Grants every permission, now and in the future. Held by the built-in Admin role. */
export const ALL_PERMISSIONS = "*";

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "General",
    permissions: [
      { key: "dashboard.view", label: "View dashboard & activity feed" },
      { key: "search.use", label: "Use global search" },
    ],
  },
  {
    label: "Partners",
    permissions: [
      { key: "partners.view", label: "View partners & companies" },
      {
        key: "partners.manage",
        label:
          "Create/edit/delete partners and their records (offices, follow-ups, goals, MDF, licenses, needs, problems, competitors)",
      },
    ],
  },
  {
    label: "People & certifications",
    permissions: [
      { key: "people.view", label: "View people & certifications" },
      { key: "people.manage", label: "Manage people & certifications" },
    ],
  },
  {
    label: "Engagements",
    permissions: [
      { key: "engagements.view", label: "View engagement log" },
      { key: "engagements.manage", label: "Log & delete engagements" },
    ],
  },
  {
    label: "Deals",
    permissions: [
      { key: "deals.view", label: "View deals" },
      { key: "deals.manage", label: "Create/edit/delete deals" },
      { key: "deals.import", label: "Import deals from Salesforce" },
    ],
  },
  {
    label: "Tiers",
    permissions: [
      { key: "tiers.view", label: "View tier ladder" },
      { key: "tiers.manage", label: "Manage tier ladder" },
    ],
  },
  {
    label: "Data export",
    permissions: [
      { key: "contacts.export", label: "Export contacts CSV (API)" },
    ],
  },
  {
    label: "Administration",
    permissions: [
      { key: "vendors.manage", label: "Manage vendors & Teams integration" },
      { key: "access.manage", label: "Manage users, roles & permissions" },
    ],
  },
];

export const PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

export function isKnownPermission(key: string): boolean {
  return PERMISSION_KEYS.includes(key);
}
