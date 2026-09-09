"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/States";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <ErrorState title="The Arena hit an unexpected error" description="Nothing was locked or changed. Try again, or return to the Arena." retry={reset} />
    </div>
  );
}
