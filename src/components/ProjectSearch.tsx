import { Search } from "lucide-react";
import { cn, inputClass } from "@/components/ui";

/** Server-rendered search form; submits to /projects via GET so it works without JavaScript. */
export function ProjectSearch({ defaultValue = "", className, size = "md", autoFocus }: { defaultValue?: string; className?: string; size?: "md" | "lg"; autoFocus?: boolean }) {
  return (
    <form action="/projects" method="get" role="search" className={cn("relative", className)}>
      <label htmlFor="project-search" className="sr-only">
        Search projects, products, or commitments
      </label>
      <Search className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate", size === "lg" ? "h-5 w-5" : "h-4 w-4")} aria-hidden="true" />
      <input
        id="project-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search projects, products, or commitments"
        autoComplete="off"
        autoFocus={autoFocus}
        className={cn(inputClass, size === "lg" ? "py-3 pl-11 pr-28 text-base" : "pl-9 pr-24")}
      />
      <kbd className="pointer-events-none absolute right-[5.5rem] top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-slate sm:block" aria-hidden="true">
        /
      </kbd>
      <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-primary rounded-md px-3 py-1.5 text-xs font-semibold text-white">
        Search
      </button>
    </form>
  );
}
