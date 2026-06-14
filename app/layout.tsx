import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getActiveVendorId, listVendors } from "@/lib/vendor";
import { VendorSwitcher } from "@/components/vendor-switcher";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const vendors = listVendors();
  const activeVendorId = await getActiveVendorId();
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      className={`h-full antialiased${theme === "dark" ? " dark" : ""}`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Nexora<span className="text-sky-600">CRM</span>
            </Link>
            {vendors.length > 0 && (
              <VendorSwitcher vendors={vendors} activeId={activeVendorId} />
            )}
            <form action="/search" method="get" className="hidden md:block">
              <input
                type="search"
                name="q"
                placeholder="Search…"
                aria-label="Search"
                className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-sky-500 focus:outline-none"
              />
            </form>
            <MainNav />
            <ThemeToggle initial={theme} />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
