"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui";

export function ShareScoreButton({ text, url }: { text: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const xHref = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${text}\n${url}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            window.prompt("Copy this summary", `${text}\n${url}`);
          }
        }}
      >
        {copied ? <Check className="h-4 w-4 text-mint" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied ? "Copied" : "Copy score card"}
      </Button>
      <a href={xHref} target="_blank" rel="noopener noreferrer" className="btn btn-secondary inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-ink">
        <Share2 className="h-4 w-4" aria-hidden="true" /> Share on X
      </a>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Score card copied" : ""}
      </span>
    </div>
  );
}
