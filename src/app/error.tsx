"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">This page could not be rendered</h1>
      <p className="mt-2 text-sm text-slate">The error has been logged. You can retry, or return to the project directory.</p>
      {error.digest ? <p className="mt-2 font-mono text-xs text-slate-dim">Reference {error.digest}</p> : null}
      <div className="mt-6 flex justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/projects" variant="secondary">
          Browse projects
        </ButtonLink>
      </div>
    </div>
  );
}
