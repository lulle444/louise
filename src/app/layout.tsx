import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { BackgroundVisuals } from "@/components/BackgroundVisuals";
import { BrandMark } from "@/components/BrandMark";
import { Disclaimer } from "@/components/Disclaimer";
import { SiteNav } from "@/components/SiteNav";
import { XIcon } from "@/components/XIcon";
import { UserMenu } from "@/components/UserMenu";
import { getConfig, SITE } from "@/lib/config";
import { SAFE_EXTERNAL_LINK_PROPS } from "@/lib/domain/url";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  metadataBase: new URL(getConfig().appUrl),
  title: { default: "SHIPTRACE — Crypto makes promises. We track what ships.", template: "%s · SHIPTRACE" },
  description: SITE.description,
  openGraph: { siteName: "SHIPTRACE", type: "website", title: "SHIPTRACE — Crypto makes promises. We track what ships.", description: SITE.description },
  twitter: { card: "summary_large_image", site: SITE.xHandle, creator: SITE.xHandle, title: "SHIPTRACE", description: "Crypto makes promises. We track what ships. Roadmaps · Evidence · Delivery history" },
};

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "Methodology" },
  { href: "/token", label: "Token (future utility)" },
  { href: "/submit", label: "Submit evidence" },
  { href: "/shipping-feed", label: "Shipping feed" },
  { href: "/deadlines", label: "Deadlines" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = getConfig();
  const user = await getSessionUser();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <BackgroundVisuals />
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
          <div className="relative">
            <SiteNav userSlot={<UserMenu user={user} />} />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-border bg-surface/60">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-md">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <BrandMark size={24} className="rounded-md" /> SHIPTRACE
                </p>
                <p className="mt-1 text-sm text-slate">{SITE.tagline}</p>
                <p className="mt-2 font-mono text-xs text-slate-dim">Roadmaps · Evidence · Delivery history</p>
                <a href={SITE.xUrl} className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink hover:border-border-strong" {...SAFE_EXTERNAL_LINK_PROPS}>
                  <XIcon className="h-4 w-4" /> Follow {SITE.xHandle} on X
                </a>
                {config.demoMode ? (
                  <p className="mt-3 text-xs text-slate-dim">Sample dataset: the projects shown are fictional examples used to demonstrate the product.</p>
                ) : null}
              </div>
              <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate sm:grid-cols-3">
                {FOOTER_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} className="hover:text-ink">
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
            <Disclaimer className="mt-6 border-t border-border pt-4" />
          </div>
        </footer>
      </body>
    </html>
  );
}
