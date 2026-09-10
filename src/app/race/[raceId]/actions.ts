"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { writeGuest } from "@/lib/auth/guest";
import { lineupInputSchema } from "@/lib/scoring/validation";
import { StoreError } from "@/lib/store/types";

export type LockResult = { ok: true; lineupId: string } | { ok: false; error: string };

/** Lock a lineup for the signed-in viewer. All rules re-validated server-side. */
export async function lockLineupAction(input: unknown): Promise<LockResult> {
  const parsed = lineupInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" ") };
  }
  const session = await getSession();
  if (!session.viewer) return { ok: false, error: "Sign in (or continue as guest) to lock a lineup." };
  try {
    const lineup = await session.store.createLineup(
      {
        raceId: parsed.data.raceId,
        userId: session.viewer.id,
        picks: parsed.data.picks,
        thesis: parsed.data.thesis || null,
        isGuest: session.viewer.isGuest,
      },
      new Date().toISOString(),
    );
    if (session.guest) await writeGuest(session.guest.guest);
    revalidatePath(`/race/${parsed.data.raceId}`);
    revalidatePath("/race");
    revalidatePath("/");
    return { ok: true, lineupId: lineup.id };
  } catch (e) {
    if (e instanceof StoreError) return { ok: false, error: e.message };
    return { ok: false, error: "Could not lock the lineup. Please try again." };
  }
}
