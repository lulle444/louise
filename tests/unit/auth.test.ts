import { describe, expect, it } from "vitest";
import {
  assertPermission,
  AuthorizationError,
  canAccessWatchlist,
  hasPermission,
  isModerator,
  parseAdminEmails,
  roleForEmail,
} from "@/lib/domain/auth";
import { createRateLimiter } from "@/lib/domain/ratelimit";

const guest = { id: "g", role: "guest" as const };
const user = { id: "u", role: "user" as const };
const moderator = { id: "m", role: "moderator" as const };
const admin = { id: "a", role: "admin" as const };

describe("Moderation authorization", () => {
  it("only moderators and admins may review evidence or change verified status", () => {
    expect(hasPermission(null, "review_evidence")).toBe(false);
    expect(hasPermission(guest, "review_evidence")).toBe(false);
    expect(hasPermission(user, "review_evidence")).toBe(false);
    expect(hasPermission(user, "change_milestone_status")).toBe(false);
    expect(hasPermission(moderator, "review_evidence")).toBe(true);
    expect(hasPermission(moderator, "change_milestone_status")).toBe(true);
    expect(hasPermission(admin, "resolve_dispute")).toBe(true);
    expect(isModerator(user)).toBe(false);
    expect(isModerator(moderator)).toBe(true);
  });

  it("only admins manage integrations", () => {
    expect(hasPermission(moderator, "manage_integrations")).toBe(false);
    expect(hasPermission(admin, "manage_integrations")).toBe(true);
  });

  it("throws AuthorizationError for ordinary users", () => {
    expect(() => assertPermission(user, "review_evidence")).toThrow(AuthorizationError);
    expect(() => assertPermission(moderator, "review_evidence")).not.toThrow();
  });

  it("derives admin role from the ADMIN_EMAILS allowlist", () => {
    const admins = parseAdminEmails(" Mod@Example.org, other@example.org ");
    expect(admins).toEqual(["mod@example.org", "other@example.org"]);
    expect(roleForEmail("mod@example.org", admins)).toBe("admin");
    expect(roleForEmail("someone@example.org", admins)).toBe("user");
    expect(roleForEmail(null, admins)).toBe("user");
  });
});

describe("Watchlist ownership", () => {
  const privateList = { userId: "u", isPublic: false };
  const publicList = { userId: "u", isPublic: true };

  it("only the owner can write", () => {
    expect(canAccessWatchlist(user, privateList, "write")).toBe(true);
    expect(canAccessWatchlist({ id: "other" }, privateList, "write")).toBe(false);
    expect(canAccessWatchlist({ id: "other" }, publicList, "write")).toBe(false);
    expect(canAccessWatchlist(null, publicList, "write")).toBe(false);
  });

  it("private lists are readable only by the owner; public lists by anyone", () => {
    expect(canAccessWatchlist(null, privateList, "read")).toBe(false);
    expect(canAccessWatchlist({ id: "other" }, privateList, "read")).toBe(false);
    expect(canAccessWatchlist(user, privateList, "read")).toBe(true);
    expect(canAccessWatchlist(null, publicList, "read")).toBe(true);
  });
});

describe("Rate limiter", () => {
  it("allows up to the limit within a window and resets after", () => {
    const limiter = createRateLimiter(2, 1000);
    expect(limiter.check("k", 0).allowed).toBe(true);
    expect(limiter.check("k", 10).allowed).toBe(true);
    expect(limiter.check("k", 20).allowed).toBe(false);
    expect(limiter.check("k", 1100).allowed).toBe(true);
    expect(limiter.check("other", 20).allowed).toBe(true);
  });
});
