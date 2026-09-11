import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { cn } from "@/components/ui";

export const BRAND_IMAGES = {
  calendar: { file: "calendar.webp", alt: "3D calendar with a highlighted deadline connected to a verification shield" },
  trace: { file: "trace.webp", alt: "3D trace line running from code brackets to a shipped package and a verified check" },
  pipeline: { file: "pipeline.webp", alt: "Five glass cards showing roadmap, code, release, deadline and verification steps" },
  scoreRing: { file: "score-ring.webp", alt: "3D score ring with a check mark surrounded by evidence icons" },
  og: { file: "og-default.png", alt: "SHIPTRACE" },
} as const;

export type BrandImageKey = keyof typeof BRAND_IMAGES;

/** True when the brand render exists under public/brand (uploaded to the repository). */
export function hasBrandImage(key: BrandImageKey): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", "brand", BRAND_IMAGES[key].file));
}

export function brandImagePath(key: BrandImageKey): string {
  return `/brand/${BRAND_IMAGES[key].file}`;
}

/**
 * Renders a brand 3D illustration when its file is present; renders nothing
 * otherwise so the layout never shows a broken image.
 */
export function BrandImage({
  name,
  className,
  imgClassName,
  priority = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: {
  name: BrandImageKey;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (!hasBrandImage(name)) return null;
  const meta = BRAND_IMAGES[name];
  return (
    <div className={cn("relative overflow-hidden rounded-[18px]", className)}>
      <Image src={brandImagePath(name)} alt={meta.alt} width={1600} height={900} sizes={sizes} priority={priority} className={cn("h-auto w-full", imgClassName)} />
    </div>
  );
}
