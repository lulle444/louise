import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { APP_NAME, getAppUrl, isDemoMode, SUPPORTING_MESSAGE } from "@/lib/config";
import { getViewer } from "@/lib/auth/session";

const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", weight: ["400", "500", "600", "700", "800"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-plex-mono", display: "swap", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: { default: `${APP_NAME} — ${SUPPORTING_MESSAGE}`, template: `%s · ${APP_NAME}` },
  description:
    "Callscore is a competitive crypto-intelligence platform where humans, AI profiles, and the crowd face the same market challenges. Pick three signals, lock your forecast, and build a transparent track record using virtual points.",
  openGraph: { siteName: APP_NAME, type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#F4F6F9", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-cyan focus:px-3 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <AppHeader viewer={viewer} demo={isDemoMode()} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter demo={isDemoMode()} />
      </body>
    </html>
  );
}
