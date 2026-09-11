import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { SAFE_EXTERNAL_LINK_PROPS } from "@/lib/domain/url";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-bg hover:bg-[#7aa1ff] border border-transparent font-semibold",
  secondary: "bg-surface-2 text-ink border border-border hover:border-border-strong hover:bg-[#182130]",
  ghost: "bg-transparent text-slate hover:text-ink border border-transparent hover:bg-surface-2",
  danger: "bg-coral-soft text-coral border border-coral/40 hover:bg-coral/20",
};
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", className, ...props }: ComponentPropsWithoutRef<"button"> & { variant?: ButtonVariant }) {
  return <button className={cn(buttonBase, buttonStyles[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  href,
  ...props
}: ComponentPropsWithoutRef<typeof Link> & { variant?: ButtonVariant; href: string }) {
  return <Link href={href} className={cn(buttonBase, buttonStyles[variant], className)} {...props} />;
}

export function ExternalLink({ href, className, children, ...props }: ComponentPropsWithoutRef<"a"> & { href: string }) {
  return (
    <a href={href} className={cn("underline decoration-border-strong underline-offset-4 hover:decoration-primary", className)} {...SAFE_EXTERNAL_LINK_PROPS} {...props}>
      {children}
    </a>
  );
}

export function Card({ className, children, as: Tag = "div", ...props }: ComponentPropsWithoutRef<"div"> & { as?: "div" | "section" | "article" }) {
  return (
    <Tag className={cn("card p-5", className)} {...props}>
      {children}
    </Tag>
  );
}

export function SectionHeading({ eyebrow, title, description, action, id }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h2 id={id} className="text-xl font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-slate">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="mb-8">
      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 max-w-3xl text-base text-slate">{description}</p> : null}
      {children}
    </header>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 border-dashed px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {description ? <p className="max-w-md text-sm text-slate">{description}</p> : null}
      {action}
    </div>
  );
}

export function Pill({ tone = "neutral", children, className }: { tone?: "neutral" | "primary" | "mint" | "amber" | "coral" | "violet"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-surface-2 text-slate border-border",
    primary: "bg-primary-soft text-primary border-primary/40",
    mint: "bg-mint-soft text-mint border-mint/40",
    amber: "bg-amber-soft text-amber border-amber/40",
    coral: "bg-coral-soft text-coral border-coral/40",
    violet: "bg-violet-soft text-violet border-violet/40",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Field({ label, htmlFor, hint, error, children, required }: { label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-coral"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-slate">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-slate-dim focus:border-primary focus:outline-none";

export function Alert({ tone = "neutral", title, children }: { tone?: "neutral" | "mint" | "amber" | "coral" | "primary"; title?: string; children: ReactNode }) {
  const tones = {
    neutral: "border-border bg-surface-2 text-slate",
    mint: "border-mint/40 bg-mint-soft text-mint",
    amber: "border-amber/40 bg-amber-soft text-amber",
    coral: "border-coral/40 bg-coral-soft text-coral",
    primary: "border-primary/40 bg-primary-soft text-primary",
  };
  return (
    <div role={tone === "coral" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wider text-slate">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-dim">{hint}</p> : null}
    </div>
  );
}
