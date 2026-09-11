import type { SessionUser, UserRole } from "./types";

export function isModerator(user: Pick<SessionUser, "role"> | null | undefined): boolean {
  return user?.role === "moderator" || user?.role === "admin";
}

export function isAdmin(user: Pick<SessionUser, "role"> | null | undefined): boolean {
  return user?.role === "admin";
}

export function canSubmit(user: Pick<SessionUser, "role"> | null | undefined): boolean {
  return !!user && user.role !== "guest";
}

export type Permission =
  | "submit_evidence"
  | "submit_dispute"
  | "manage_own_watchlist"
  | "review_evidence"
  | "change_milestone_status"
  | "resolve_dispute"
  | "manage_projects"
  | "recalculate_scores"
  | "manage_integrations";

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  guest: [],
  user: ["submit_evidence", "submit_dispute", "manage_own_watchlist"],
  moderator: [
    "submit_evidence",
    "submit_dispute",
    "manage_own_watchlist",
    "review_evidence",
    "change_milestone_status",
    "resolve_dispute",
    "manage_projects",
    "recalculate_scores",
  ],
  admin: [
    "submit_evidence",
    "submit_dispute",
    "manage_own_watchlist",
    "review_evidence",
    "change_milestone_status",
    "resolve_dispute",
    "manage_projects",
    "recalculate_scores",
    "manage_integrations",
  ],
};

export function hasPermission(user: Pick<SessionUser, "role"> | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

export function assertPermission(user: Pick<SessionUser, "role"> | null | undefined, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
}

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function roleForEmail(email: string | null | undefined, adminEmails: readonly string[]): UserRole {
  if (email && adminEmails.includes(email.toLowerCase())) return "admin";
  return "user";
}

/** Only the owner of a watchlist may read (if private) or modify it. */
export function canAccessWatchlist(
  user: Pick<SessionUser, "id"> | null,
  watchlist: { userId: string; isPublic: boolean },
  mode: "read" | "write",
): boolean {
  if (mode === "read" && watchlist.isPublic) return true;
  return !!user && user.id === watchlist.userId;
}
