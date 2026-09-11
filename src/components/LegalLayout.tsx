import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { SITE } from "@/lib/config";
import { SAFE_EXTERNAL_LINK_PROPS } from "@/lib/domain/url";

export const LEGAL_OPERATOR = "SHIPTRACE";
export const LEGAL_UPDATED = "11 September 2026";

/** Contact channel used across the legal pages. */
export function LegalContact() {
  return (
    <>
      a direct message to{" "}
      <a href={SITE.xUrl} className="text-primary underline underline-offset-4" {...SAFE_EXTERNAL_LINK_PROPS}>
        {SITE.xHandle} on X
      </a>{" "}
      or the{" "}
      <Link href="/submit?tab=correction" className="text-primary underline underline-offset-4">
        correction form
      </Link>
    </>
  );
}

export function LegalLayout({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <p className="mb-6 font-mono text-xs text-slate">Last updated {LEGAL_UPDATED}</p>
      <div className="legal space-y-8 text-sm leading-relaxed text-slate">{children}</div>
      <p className="mt-10 border-t border-border pt-4 text-xs text-slate">
        See also the{" "}
        <Link href="/privacy" className="text-primary underline underline-offset-4">
          Privacy Policy
        </Link>
        , the{" "}
        <Link href="/terms" className="text-primary underline underline-offset-4">
          Terms of Use
        </Link>{" "}
        and the{" "}
        <Link href="/methodology" className="text-primary underline underline-offset-4">
          Methodology
        </Link>
        .
      </p>
    </div>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="space-y-3">
      <h2 id={`${id}-h`} className="text-lg font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}
