"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items, onNavigate, vertical = false }: { items: Array<{ href: string; label: string }>; onNavigate?: () => void; vertical?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${vertical ? "block" : ""} ${active ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2/70 hover:text-text"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
