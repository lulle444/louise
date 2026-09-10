"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

/** Accessible inline explanation with a link to the full methodology. */
export function MethodologyTooltip({ label, children, anchor }: { label: string; children: React.ReactNode; anchor?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`How ${label} works`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted hover:text-ink"
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="card absolute left-0 top-7 z-30 w-72 px-3 py-2 text-left text-xs font-normal leading-relaxed text-muted shadow-xl"
        >
          {children}{" "}
          <Link href={`/methodology${anchor ? `#${anchor}` : ""}`} className="text-cyan underline-offset-2 hover:underline">
            Full methodology
          </Link>
        </span>
      ) : null}
    </span>
  );
}
