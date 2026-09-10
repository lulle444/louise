import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { LiveTicker } from "@/components/LiveTicker";
import { APP_NAME, APP_TAGLINE, getAppUrl } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: { default: `${APP_NAME} — ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description:
    "Draft three crypto narratives, allocate your conviction, and compete against AI and the crowd. An educational forecasting game using virtual points.",
  openGraph: { title: APP_NAME, description: APP_TAGLINE, type: "website" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#06080D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-lime focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <AppHeader />
        <LiveTicker />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 sm:px-6 lg:px-8">
          {children}
        </main>
        <AppFooter />
      </body>
    </html>
  );
}
