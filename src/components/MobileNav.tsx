"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </button>
      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="absolute inset-x-0 top-16 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/token" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink">
                Future utility
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
