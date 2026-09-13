import { buildDemoState } from "./seed";
import type { DemoState } from "./store";

const g = globalThis as unknown as { __alphrDemoState?: Promise<DemoState> };

/** Process-wide singleton for Demo Mode state. Rebuilt on server restart. */
export function getDemoState(): Promise<DemoState> {
  if (!g.__alphrDemoState) {
    g.__alphrDemoState = buildDemoState().catch((err) => {
      g.__alphrDemoState = undefined;
      throw err;
    });
  }
  return g.__alphrDemoState;
}

export async function resetDemoState(): Promise<void> {
  g.__alphrDemoState = undefined;
  await getDemoState();
}
