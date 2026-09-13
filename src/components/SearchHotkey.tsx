"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Press "/" anywhere to focus the search box, or jump to the directory if the page has none. */
export function SearchHotkey() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      const input = document.querySelector<HTMLInputElement>("#project-search, #q");
      event.preventDefault();
      if (input) {
        input.focus();
        input.select();
      } else {
        router.push("/projects");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
