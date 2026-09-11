import Image from "next/image";

/** SHIPTRACE logo mark. Replace public/brand/shiptrace-mark.svg with the official raster/vector export if preferred. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return <Image src="/brand/shiptrace-mark.svg" alt="" width={size} height={size} className={className} priority />;
}
