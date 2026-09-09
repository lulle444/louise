"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let timer: number | null = null;
let current = 0;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (timer === null) {
    current = Date.now();
    timer = window.setInterval(() => {
      current = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

/** Shared one-second clock. Returns null during SSR/hydration to avoid mismatches. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => (current || (current = Date.now())),
    () => null,
  );
}

const noop = () => () => {};

/** Runs a client-only formatter after hydration; returns null on the server. */
export function useClientValue<T>(compute: () => T, key: string): T | null {
  return useSyncExternalStore(noop, () => cacheGet(key, compute), () => null);
}

const cache = new Map<string, unknown>();
function cacheGet<T>(key: string, compute: () => T): T {
  if (!cache.has(key)) cache.set(key, compute());
  return cache.get(key) as T;
}
