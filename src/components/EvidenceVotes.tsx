"use client";

import { useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { voteOnEvidence } from "@/lib/actions/submissions";
import { Button } from "@/components/ui";

export function EvidenceVotes({ evidenceId, path, signedIn }: { evidenceId: string; path: string; signedIn: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  if (!signedIn) return <p className="text-xs text-slate">Sign in to support or challenge this evidence. Votes signal where moderators should look; they never change verified status.</p>;
  const vote = (kind: "support" | "challenge") =>
    startTransition(async () => {
      const result = await voteOnEvidence(evidenceId, kind, path);
      setMessage(result.ok ? `Recorded your ${kind}.` : (result.message ?? "Could not record vote."));
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" disabled={pending} onClick={() => vote("support")} className="px-3 py-1.5 text-xs">
        <ThumbsUp className="h-3.5 w-3.5 text-mint" aria-hidden="true" /> Support
      </Button>
      <Button type="button" variant="secondary" disabled={pending} onClick={() => vote("challenge")} className="px-3 py-1.5 text-xs">
        <ThumbsDown className="h-3.5 w-3.5 text-coral" aria-hidden="true" /> Challenge
      </Button>
      <span role="status" className="text-xs text-slate">
        {message ?? "Votes signal where moderators should look; they never change verified status."}
      </span>
    </div>
  );
}
