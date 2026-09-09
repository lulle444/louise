import { buildDemoState } from "./seed";
import type { DemoState } from "./store";

const g = globalThis as unknown as { __signalArenaDemoState?: Promise<DemoState> };

/** Process-wide singleton for Demo Mode state. Rebuilt on server restart. */
export function getDemoState(): Promise<DemoState> {
  if (!g.__signalArenaDemoState) {
    g.__signalArenaDemoState = buildDemoState().catch((err) => {
      g.__signalArenaDemoState = undefined;
      throw err;
    });
  }
  return g.__signalArenaDemoState;
}

export async function resetDemoState(): Promise<void> {
  g.__signalArenaDemoState = undefined;
  await getDemoState();
}
