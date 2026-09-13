import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SIGNALS } from "@/lib/domain/catalogue";
import { FORECASTING_RESOURCES, SIGNAL_GUIDES } from "@/lib/domain/learn";
import { PageHeader } from "@/components/ui/Section";
import { SignalIcon } from "@/components/ui/SignalIcon";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata: Metadata = {
  title: "Learn",
  description: "How to read each of the eight signals, where the real data lives, and how to get better at making calls.",
};

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-cyan hover:underline">
      {children} <ExternalLink className="size-3.5" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export default function LearnPage() {
  const guides = SIGNAL_GUIDES.map((g) => ({ guide: g, signal: SIGNALS.find((s) => s.slug === g.slug) })).filter((x) => x.signal);
  return (
    <>
      <PageHeader eyebrow="Learn" title="How to read the signals" description="Every call cites three signals. Here is what each one measures, when it leans bullish or bearish, the trap to avoid, and where to check the real data before you lock. All links go to free, public sources we're not affiliated with." />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav aria-label="Signals" className="mb-8 flex flex-wrap gap-2">
          {guides.map(({ signal }) => (
            <a key={signal!.slug} href={`#${signal!.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:border-border-strong">
              <SignalIcon name={signal!.icon} className="size-3.5 text-muted" /> {signal!.name}
            </a>
          ))}
        </nav>

        <div className="grid gap-5 md:grid-cols-2">
          {guides.map(({ guide, signal }) => (
            <article key={guide.slug} id={guide.slug} className="card scroll-mt-24 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-surface-2 text-cyan"><SignalIcon name={signal!.icon} className="size-5" /></span>
                <div>
                  <h2 className="text-xl">{signal!.name}</h2>
                  <p className="text-xs text-muted">{signal!.description}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-text/90">{guide.howToRead}</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-bull/30 bg-bull/5 p-3">
                  <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-bull">Leans bullish when</dt>
                  <dd className="mt-1 text-muted">{guide.bullishWhen}</dd>
                </div>
                <div className="rounded-lg border border-bear/30 bg-bear/5 p-3">
                  <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-bear">Leans bearish when</dt>
                  <dd className="mt-1 text-muted">{guide.bearishWhen}</dd>
                </div>
              </dl>
              <p className="mt-3 rounded-lg border border-border bg-surface-2/60 p-3 text-sm text-muted"><span className="font-semibold text-text">The trap:</span> {guide.trap}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {guide.links.map((l) => (
                  <li key={l.url}>
                    <Ext href={l.url}>{l.label}</Ext>
                    {l.note ? <span className="text-muted"> · {l.note}</span> : null}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <section className="card mt-10 p-6" aria-labelledby="forecasting-heading">
          <h2 id="forecasting-heading" className="text-2xl">Getting better at making calls</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted">Reading the market is half of it. The other half is knowing how good your own judgement is. These are the resources behind how Alphr scores you, and the places serious forecasters practise.</p>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {FORECASTING_RESOURCES.map((r) => (
              <li key={r.url} className="rounded-lg border border-border p-4 text-sm">
                <Ext href={r.url}>{r.label}</Ext>
                <p className="mt-1 text-muted">{r.note}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">
            Three habits that show up in every good track record: commit before you look at the crowd, update in small steps rather than flipping, and keep the score even when it’s unflattering. Alphr enforces the first and does the third for you. <Link href="/methodology" className="text-cyan hover:underline">How scoring works →</Link>
          </p>
        </section>

        <p className="mt-6 text-xs text-muted">External links are provided for education only. Alphr is not affiliated with these sites, receives nothing for the links, and none of this is financial advice.</p>
        <div className="mt-4"><Disclaimer compact /></div>
      </div>
    </>
  );
}
