"use client";

import { ErrorState } from "@/components/ErrorState";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-16">
      <ErrorState
        title="Something went wrong"
        description={error.message || "An unexpected error occurred while rendering this page."}
        action={
          <button type="button" className="btn btn-secondary" onClick={() => reset()}>
            Try again
          </button>
        }
      />
    </div>
  );
}
