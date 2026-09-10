import "server-only";
import { cookies } from "next/headers";
import type { GuestState } from "@/lib/store/guest-overlay";

export const GUEST_COOKIE = "mr_guest";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function readGuest(): Promise<GuestState | null> {
  const store = await cookies();
  const raw = store.get(GUEST_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as GuestState;
    if (!parsed || typeof parsed.id !== "string" || !Array.isArray(parsed.lineups)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Only callable from Server Actions / Route Handlers. */
export async function writeGuest(state: GuestState): Promise<void> {
  const store = await cookies();
  const value = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  store.set(GUEST_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearGuest(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_COOKIE);
}

export function newGuestState(admin = false): GuestState {
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    id: `guest_${suffix}`,
    username: `guest-${suffix}`,
    displayName: admin ? "Demo Admin" : "Guest Forecaster",
    admin,
    createdAt: new Date().toISOString(),
    lineups: [],
  };
}
