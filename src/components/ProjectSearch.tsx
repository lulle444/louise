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
      <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-bg hover:bg-[#7aa1ff]">
        Search
      </button>
    </form>
  );
}
