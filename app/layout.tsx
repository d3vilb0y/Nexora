import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexora Partner CRM",
  description:
    "Track partners, personnel, certifications, engagement and partner health.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/log", label: "Log" },
  { href: "/partners", label: "Partners" },
  { href: "/deals", label: "Deals" },
  { href: "/people", label: "People" },
  { href: "/certifications", label: "Certifications" },
  { href: "/tiers", label: "Tiers" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Nexora<span className="text-sky-600">CRM</span>
            </Link>
            <nav className="-mx-1 flex gap-1 overflow-x-auto">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
