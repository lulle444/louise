import { SITE } from "@/lib/config";
import { SAFE_EXTERNAL_LINK_PROPS } from "@/lib/domain/url";
import { BrandImage, hasBrandImage } from "./BrandImage";
import { XIcon } from "./XIcon";

export function FollowCta() {
  return (
    <section aria-labelledby="follow-heading" className="card overflow-hidden p-0">
      <div className="grid items-center lg:grid-cols-[1.1fr_1fr]">
        <div className="p-6 sm:p-8">
          <p className="eyebrow">Weekly digest</p>
          <h2 id="follow-heading" className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            What shipped this week, every week
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate">Verified shipments, missed deadlines and new commitments, posted with sources. No price talk, no hype.</p>
          <a href={SITE.xUrl} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f3a6b]" {...SAFE_EXTERNAL_LINK_PROPS}>
            <XIcon className="h-4 w-4" /> Follow {SITE.xHandle}
          </a>
        </div>
        {hasBrandImage("trace") ? <BrandImage name="trace" className="rounded-none" sizes="(min-width: 1024px) 45vw, 100vw" /> : null}
      </div>
    </section>
  );
}
