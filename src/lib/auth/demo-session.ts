import "server-only";
import { cookies } from "next/headers";
import type { Profile, Viewer } from "../domain/types";
import { emptyOverlay, type DemoOverlay } from "../data/demo/repository";

export const DEMO_SESSION_COOKIE = "sa_demo_session";
export const DEMO_OVERLAY_COOKIE = "sa_demo_overlay";

export interface DemoSession {
  id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  isGuest: boolean;
}

function parseJson<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function readDemoSession(): Promise<DemoSession | null> {
  const store = await cookies();
  const s = parseJson<DemoSession>(store.get(DEMO_SESSION_COOKIE)?.value);
  if (!s || typeof s.id !== "string" || typeof s.username !== "string") return null;
  return { id: s.id, username: s.username, displayName: s.displayName || s.username, isAdmin: Boolean(s.isAdmin), isGuest: Boolean(s.isGuest) };
}

export async function readDemoOverlay(): Promise<DemoOverlay> {
  const store = await cookies();
  const o = parseJson<Partial<DemoOverlay>>(store.get(DEMO_OVERLAY_COOKIE)?.value);
  if (!o) return emptyOverlay();
  return {
    profiles: Array.isArray(o.profiles) ? o.profiles : [],
    predictions: Array.isArray(o.predictions) ? o.predictions : [],
    xpLedger: Array.isArray(o.xpLedger) ? o.xpLedger : [],
    userBadges: Array.isArray(o.userBadges) ? o.userBadges : [],
  };
}

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };

export async function writeDemoSession(session: DemoSession): Promise<void> {
  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, JSON.stringify(session), COOKIE_OPTS);
}

export async function writeDemoOverlay(overlay: DemoOverlay): Promise<void> {
  const store = await cookies();
  // Keep the cookie small: most recent predictions and ledger entries only.
  const trimmed: DemoOverlay = {
    profiles: overlay.profiles.slice(0, 1),
    predictions: overlay.predictions.slice(-8),
    xpLedger: overlay.xpLedger.slice(-16),
    userBadges: overlay.userBadges.slice(-12),
  };
  store.set(DEMO_OVERLAY_COOKIE, JSON.stringify(trimmed), COOKIE_OPTS);
}

export async function clearDemoSession(): Promise<void> {
  const store = await cookies();
  store.delete(DEMO_SESSION_COOKIE);
  store.delete(DEMO_OVERLAY_COOKIE);
}

export function demoSessionToViewer(s: DemoSession): Viewer {
  return { id: s.id, username: s.username, displayName: s.displayName, email: null, isAdmin: s.isAdmin, isGuest: s.isGuest };
}

export function guestProfile(session: DemoSession): Profile {
  const now = new Date().toISOString();
  return { id: session.id, username: session.username, displayName: session.displayName, avatarUrl: null, bio: "Demo guest session. Forecasts live in this browser only.", xp: 0, currentStreak: 0, longestStreak: 0, isAdmin: false, createdAt: now, updatedAt: now };
}
