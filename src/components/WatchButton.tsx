"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toggleWatch } from "@/lib/actions/watchlist";
import { Button } from "@/components/ui";

export function WatchButton({ projectId, initialWatching, signedIn, path, size = "md" }: { projectId: string; initialWatching: boolean; signedIn: boolean; path: string; size?: "sm" | "md" }) {
  const [watching, setWatching] = useState(initialWatching);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  if (!signedIn) {
    return (
      <Button variant="secondary" type="button" onClick={() => router.push(`/login?next=${encodeURIComponent(path)}`)} className={size === "sm" ? "px-3 py-1.5 text-xs" : ""}>
        <Bookmark className="h-4 w-4" aria-hidden="true" /> Follow
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={watching ? "primary" : "secondary"}
        aria-pressed={watching}
        disabled={pending}
        className={size === "sm" ? "px-3 py-1.5 text-xs" : ""}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await toggleWatch(projectId, path);
            if (result.ok) setWatching(!!result.watching);
            else setError(result.message ?? "Could not update watchlist.");
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : watching ? <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
        {watching ? "Following" : "Follow"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}
