import { Share2 } from "lucide-react";
import { X_HANDLE } from "@/lib/config";

export function ShareOnX({ text, url, className = "" }: { text: string; url: string; className?: string }) {
  const href = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&via=${X_HANDLE}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`btn btn-secondary ${className}`} data-testid="share-x">
      <Share2 className="h-4 w-4" aria-hidden="true" />
      Share on X
    </a>
  );
}
