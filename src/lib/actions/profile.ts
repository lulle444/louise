"use server";

import { revalidatePath } from "next/cache";
import { isDemoMode } from "../config";
import { profileUpdateSchema } from "../domain/validation";
import { getRepository } from "../data";
import { getViewer } from "../auth/session";
import { syncDemoOverlay } from "./demo-sync";

export interface ProfileFormState {
  error?: string;
  message?: string;
}

export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in required." };
  const parsed = profileUpdateSchema.safeParse({ displayName: formData.get("displayName"), bio: formData.get("bio") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const repo = await getRepository();
  try {
    await repo.updateProfile(viewer.id, { displayName: parsed.data.displayName, bio: parsed.data.bio });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update profile." };
  }
  if (isDemoMode()) await syncDemoOverlay(viewer.id);
  revalidatePath(`/profile/${viewer.username}`);
  return { message: "Profile updated." };
}
