import { buildDemoState } from "./seed";
import type { DemoState } from "./store";

const g = globalThis as unknown as { __callscoreDemoState?: Promise<DemoState> };

/** Process-wide singleton for Demo Mode state. Rebuilt on server restart. */
export function getDemoState(): Promise<DemoState> {
  if (!g.__callscoreDemoState) {
    g.__callscoreDemoState = buildDemoState().catch((err) => {
      g.__callscoreDemoState = undefined;
      throw err;
    });
  }
  return g.__callscoreDemoState;
}

export async function resetDemoState(): Promise<void> {
  g.__callscoreDemoState = undefined;
  await getDemoState();
}
