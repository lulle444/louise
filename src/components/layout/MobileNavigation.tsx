"use client";

import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import type { Viewer } from "@/lib/domain/types";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
import { XIcon } from "@/components/ui/XIcon";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";

export function MobileNavigation({ items, viewer, demo, xUrl, xHandle }: { items: Array<{ href: string; label: string }>; viewer: Viewer | null; demo: boolean; xUrl: string; xHandle: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="ml-auto md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Close menu" : "Open menu"}
        className="grid size-10 place-items-center rounded-md border border-border text-text"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open ? (
        <div id={id} className="fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto border-b border-border bg-bg p-4">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            <NavLinks items={items} vertical onNavigate={() => setOpen(false)} />
            <NavLinks items={[{ href: "/about", label: "About" }, { href: "/token", label: "Token (planned)" }]} vertical onNavigate={() => setOpen(false)} />
            <a href={xUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2/70 hover:text-text">
              <XIcon className="size-4" /> Follow @{xHandle} on X
            </a>
          </nav>
          <div className="mt-4 border-t border-border pt-4">
            <UserMenu viewer={viewer} stacked />
          </div>
          {demo ? <div className="mt-4"><DemoModeBadge /></div> : null}
        </div>
      ) : null}
    </div>
  );
}
