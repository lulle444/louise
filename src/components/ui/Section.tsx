import Link from "next/link";
import type { ReactNode } from "react";

export function Section({ eyebrow, title, description, action, children, className = "" }: { eyebrow?: string; title: string; description?: string; action?: { href: string; label: string }; children: ReactNode; className?: string }) {
  return (
    <section className={`mx-auto max-w-7xl px-4 py-10 sm:px-6 ${className}`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
          <h2 className="text-2xl sm:text-3xl">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
        </div>
        {action ? (
          <Link href={action.href} className="text-sm text-cyan hover:underline">
            {action.label} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-b border-border bg-surface/30">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-8 sm:px-6 sm:py-10">
        <div className="max-w-2xl">
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          {description ? <div className="mt-2 text-sm text-muted sm:text-base">{description}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
