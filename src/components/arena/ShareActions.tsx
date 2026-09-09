"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

export function ShareActions({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const xHref = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", url);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-2" aria-live="polite">
        {copied ? <Check className="size-4 text-bull" aria-hidden /> : <Link2 className="size-4" aria-hidden />} {copied ? "Link copied" : "Copy link"}
      </button>
      <a href={xHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-2">
        <Share2 className="size-4" aria-hidden /> Share on X
      </a>
    </div>
  );
}
