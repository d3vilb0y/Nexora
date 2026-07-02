import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getActiveVendorId, listVendors } from "@/lib/vendor";
import { getSession, hasPermission, type Session } from "@/lib/auth";
import { VendorSwitcher } from "@/components/vendor-switcher";
import { MainNav, type NavItem } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nexora Partner CRM",
    template: "%s · Nexora CRM",
  },
  description:
    "Track partners, personnel, certifications, engagement and partner health.",
};

/** Nav entries paired with the permission that unlocks them. */
const NAV: (NavItem & { permission: string })[] = [
  { href: "/", label: "Dashboard", permission: "dashboard.view" },
  { href: "/activity", label: "Activity", permission: "dashboard.view" },
  { href: "/log", label: "Log", permission: "engagements.manage" },
  { href: "/partners", label: "Partners", permission: "partners.view" },
  { href: "/companies", label: "Companies", permission: "partners.view" },
  { href: "/deals", label: "Deals", permission: "deals.view" },
  { href: "/people", label: "People", permission: "people.view" },
  {
    href: "/certifications",
    label: "Certifications",
    permission: "people.view",
  },
  { href: "/tiers", label: "Tiers", permission: "tiers.view" },
  { href: "/admin", label: "Admin", permission: "vendors.manage" },
  { href: "/admin/access", label: "Access", permission: "access.manage" },
];

function visibleNav(session: Session): NavItem[] {
  return NAV.filter((item) => hasPermission(session, item.permission)).map(
    ({ href, label }) => ({ href, label })
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  const htmlCls = `h-full antialiased${theme === "dark" ? " dark" : ""}`;

  // Signed out: a bare shell for /login (and any page mid-redirect) — no nav,
  // no vendor names, nothing that leaks CRM data to anonymous visitors.
  if (!session) {
    return (
      <html lang="en" className={htmlCls}>
        <body className="min-h-full bg-slate-50 text-slate-900">
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </body>
      </html>
    );
  }

  const vendors = listVendors();
  const activeVendorId = await getActiveVendorId();

  return (
    <html lang="en" className={htmlCls}>
      <body className="min-h-full bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Nexora<span className="text-sky-600">CRM</span>
            </Link>
            {vendors.length > 0 && (
              <VendorSwitcher vendors={vendors} activeId={activeVendorId} />
            )}
            {hasPermission(session, "search.use") && (
              <form action="/search" method="get" className="hidden md:block">
                <input
                  type="search"
                  name="q"
                  placeholder="Search…"
                  aria-label="Search"
                  className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-sky-500 focus:outline-none"
                />
              </form>
            )}
            <MainNav items={visibleNav(session)} />
            <ThemeToggle initial={theme} />
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              synthetic={session.synthetic}
            />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
