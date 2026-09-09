import "server-only";
import { getDemoState } from "../data/demo";
import { writeDemoOverlay } from "../auth/demo-session";

/**
 * Persist the viewer's own Demo Mode rows into the session cookie so the
 * locked state survives serverless cold starts / in-memory resets.
 */
export async function syncDemoOverlay(userId: string): Promise<void> {
  const state = await getDemoState();
  const profile = state.profiles.find((p) => p.id === userId);
  await writeDemoOverlay({
    profiles: profile ? [profile] : [],
    predictions: state.predictions.filter((p) => p.userId === userId && p.createdAt >= state.builtAt).slice(-8),
    xpLedger: state.xpLedger.filter((e) => e.userId === userId && e.createdAt >= state.builtAt).slice(-16),
    userBadges: state.userBadges.filter((b) => b.userId === userId && b.awardedAt >= state.builtAt).slice(-12),
  });
}
