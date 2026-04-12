"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "../../lib/auth";

type RailItem = {
  label: string;
  href?: string;
  initials: string;
  disabled?: boolean;
};

const ITEMS: RailItem[] = [
  { label: "Tickets", href: "/", initials: "T" },
  { label: "Categories", href: "/categories", initials: "C" },
  { label: "Reports", initials: "R", disabled: true },
  { label: "Settings", initials: "S", disabled: true }
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/tickets/");
  }
  return pathname.startsWith(href);
}

export function IconRail() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-16 border-r border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-full flex-col items-center py-3">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
          IT
        </div>

        <nav className="flex flex-1 flex-col items-center gap-2">
          {ITEMS.map((item) => {
            const active = item.href ? isActive(pathname, item.href) : false;
            const baseClassName =
              "flex h-11 w-11 items-center justify-center rounded-xl text-xs font-semibold transition-colors";
            const activeClassName = active
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

            if (item.disabled || !item.href) {
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled
                  title={`${item.label} (coming soon)`}
                  className={`${baseClassName} cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400`}
                >
                  <span aria-hidden>{item.initials}</span>
                  <span className="sr-only">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                className={`${baseClassName} ${activeClassName}`}
                aria-current={active ? "page" : undefined}
              >
                <span aria-hidden>{item.initials}</span>
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout at bottom of rail */}
        <button
          type="button"
          onClick={handleLogout}
          title="Sign out"
          className="mt-auto flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <span aria-hidden className="text-sm font-semibold">⏻</span>
          <span className="sr-only">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
