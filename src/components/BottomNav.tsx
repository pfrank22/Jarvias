"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Home", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/projects", label: "Projects", icon: "M3 7h18M3 12h18M3 17h18" },
  { href: "/approvals", label: "Approvals", icon: "M9 12l2 2 4-4M12 3a9 9 0 100 18 9 9 0 000-18z" },
];

export function BottomNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:static md:border-0 md:bg-transparent md:pb-0"
    >
      <ul className="mx-auto flex max-w-3xl justify-around md:justify-start md:gap-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-20 flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium md:flex-row md:gap-2 md:rounded-lg md:text-sm ${
                  active ? "text-brand-600 md:bg-brand-50" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 md:h-5 md:w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={item.icon} />
                </svg>
                {item.label}
                {item.href === "/approvals" && pendingCount > 0 ? (
                  <span className="absolute right-3 top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-4 text-white md:static">
                    {pendingCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
