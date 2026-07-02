"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Primary navigation. The layout passes only the items the signed-in user's
 * permissions allow. Highlights the section the user is in (including detail
 * routes like /partners/123) so the current location is always obvious.
 */
export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // Longest matching href wins, so /admin/access doesn't also light up /admin.
  const activeHref = items
    .filter((i) => isActive(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto sm:ml-auto">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
