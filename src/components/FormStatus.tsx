"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/actions/types";
import { Alert, Button } from "@/components/ui";

export function SubmitButton({ children, variant = "primary", className }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-busy={pending} className={className}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </Button>
  );
}

export function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <Alert tone={state.ok ? "mint" : "coral"}>{state.message}</Alert>;
}
