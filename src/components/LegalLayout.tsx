import Link from "next/link";
import { Alert, PageHeader } from "@/components/ui";

export const LEGAL_OPERATOR = "[Company name], [registered address], [country]";
export const LEGAL_CONTACT = "[contact email]";
export const LEGAL_UPDATED = "11 September 2026";

export function LegalLayout({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <p className="mb-6 font-mono text-xs text-slate">Last updated {LEGAL_UPDATED}</p>
      {LEGAL_OPERATOR.startsWith("[") ? (
        <div className="mb-6">
          <Alert tone="amber" title="Draft">
            This page is a draft. Replace the bracketed placeholders (operator name, address, contact email, governing law) in <code className="font-mono text-xs">src/components/LegalLayout.tsx</code> and have the text reviewed by a lawyer before public launch.
          </Alert>
        </div>
      ) : null}
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
