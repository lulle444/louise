"use client";

import { useActionState } from "react";
import { signInWithPassword, signUpWithPassword } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/types";
import { ActionMessage, SubmitButton } from "./FormStatus";
import { Field, inputClass } from "@/components/ui";

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signInWithPassword, initialActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <ActionMessage state={state} />
      <Field label="Email" htmlFor="email" error={state.errors?.email} required>
        <input id="email" name="email" type="email" autoComplete="email" className={inputClass} required />
      </Field>
      <Field label="Password" htmlFor="password" error={state.errors?.password} required>
        <input id="password" name="password" type="password" autoComplete="current-password" className={inputClass} required />
      </Field>
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpWithPassword, initialActionState);
  if (state.ok) return <ActionMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <ActionMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" htmlFor="username" error={state.errors?.username} hint="Public. 3–32 lowercase letters, numbers or dashes." required>
          <input id="username" name="username" type="text" autoComplete="username" className={inputClass} required />
        </Field>
        <Field label="Display name" htmlFor="displayName" error={state.errors?.displayName} required>
          <input id="displayName" name="displayName" type="text" autoComplete="name" className={inputClass} required />
        </Field>
      </div>
      <Field label="Email" htmlFor="su-email" error={state.errors?.email} required>
        <input id="su-email" name="email" type="email" autoComplete="email" className={inputClass} required />
      </Field>
      <Field label="Password" htmlFor="su-password" error={state.errors?.password} hint="At least 8 characters." required>
        <input id="su-password" name="password" type="password" autoComplete="new-password" className={inputClass} required />
      </Field>
      <SubmitButton>Create account</SubmitButton>
    </form>
  );
}
