/**
 * Seed a Supabase project with the deterministic demo world.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-supabase.ts
 *
 * Creates demo auth users (password: metarace-demo), profiles, narratives,
 * assets, constituent versions, races, snapshots, lineups, results, XP and
 * badges. Safe to re-run: rows are upserted by id.
 */
import { createClient } from "@supabase/supabase-js";
import { buildDemoWorld } from "../src/lib/demo/world";
import { buildCatalogue } from "../src/lib/demo/catalogue";
import { AI_PROFILES } from "../src/lib/scoring/ai";
import { BADGES } from "../src/lib/scoring/badges";
import { DEMO_USERS } from "../src/lib/demo/users";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function main() {
  const now = new Date().toISOString();
  const world = await buildDemoWorld(now);
  const s = world.store.state;
  const catalogue = buildCatalogue(now);

  // 1. Auth users → profile ids must be real auth.users uuids.
  const idMap = new Map<string, string>();
  for (const u of DEMO_USERS) {
    const email = `${u.username.replace(/[^a-z0-9]/g, "")}@demo.metarace.local`;
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users.find((x) => x.email === email);
    let id = existing?.id;
    if (!id) {
      const created = await db.auth.admin.createUser({ email, password: "metarace-demo", email_confirm: true, user_metadata: { username: u.username, display_name: u.displayName } });
      if (created.error || !created.data.user) throw new Error(`create user ${email}: ${created.error?.message ?? "no user"}`);
      id = created.data.user.id;
    }
    idMap.set(u.id, id);
    await must(db.from("profiles").upsert({ id, username: u.username, display_name: u.displayName, avatar_seed: u.username, bio: u.bio, is_demo: true }), "profile");
  }
  const uid = (id: string | null) => (id ? (idMap.get(id) ?? null) : null);

  // 2. Catalogue.
  await must(db.from("assets").upsert(catalogue.assets.map((a) => ({ id: a.id, symbol: a.symbol, name: a.name }))), "assets");
  await must(db.from("narratives").upsert(catalogue.narratives.map((n) => ({ id: n.id, slug: n.slug, name: n.name, short_name: n.shortName, description: n.description, icon: n.icon, accent_color: n.accentColor, active: n.active, current_constituent_version_id: null }))), "narratives");
  await must(db.from("narrative_constituent_versions").upsert(catalogue.versions.map((v) => ({ id: v.id, narrative_id: v.narrativeId, version: v.version, note: v.note, created_at: v.createdAt }))), "versions");
  await must(db.from("narrative_constituents").upsert(catalogue.versions.flatMap((v) => v.constituents.map((c) => ({ version_id: v.id, asset_id: c.assetId, weight: c.weight })))), "constituents");
  for (const n of catalogue.narratives) await must(db.from("narratives").update({ current_constituent_version_id: n.currentConstituentVersionId }).eq("id", n.id), "narrative version");
  await must(db.from("ai_profiles").upsert(AI_PROFILES.map((p) => ({ id: p.id, code: p.code, name: p.name, tagline: p.tagline, description: p.description, strategy_version: p.strategyVersion, accent_color: p.accentColor }))), "ai profiles");
  await must(db.from("badges").upsert(BADGES.map((b) => ({ code: b.code, name: b.name, description: b.description, icon: b.icon }))), "badges");

  // 3. Races and snapshots.
  await must(db.from("races").upsert(s.races.map((r) => ({ id: r.id, number: r.number, name: r.name, status: r.status, published_at: r.publishedAt, locks_at: r.locksAt, starts_at: r.startsAt, ends_at: r.endsAt, settled_at: r.settledAt, void_reason: r.voidReason, formula_version: r.formulaVersion, featured: r.featured, is_demo: true }))), "races");
  for (let i = 0; i < s.snapshots.length; i += 500) {
    await must(db.from("narrative_snapshots").upsert(s.snapshots.slice(i, i + 500).map((x) => ({ id: x.id, race_id: x.raceId, narrative_id: x.narrativeId, kind: x.kind, taken_at: x.takenAt, raw: x.raw, normalized: x.normalized, score: x.score, rank: x.rank, source: x.source, constituent_version_id: x.constituentVersionId, formula_version: x.formulaVersion, quality: x.quality }))), "snapshots");
  }

  // 4. Lineups (bypassing immutability triggers is unnecessary: rows are inserted once).
  const lineupRows = s.lineups.map((l) => ({ id: l.id, race_id: l.raceId, kind: l.kind, user_id: uid(l.userId), ai_profile_id: l.aiProfileId, thesis: l.thesis, created_at: l.createdAt, locked_at: l.lockedAt, status: l.status, strategy_version: l.strategyVersion ?? null, input_snapshot_id: l.inputSnapshotId ?? null }));
  await must(db.from("lineups").upsert(lineupRows, { ignoreDuplicates: true }), "lineups");
  await must(db.from("lineup_picks").upsert(s.lineups.flatMap((l) => l.picks.map((p) => ({ lineup_id: l.id, role: p.role, narrative_id: p.narrativeId, energy: p.energy }))), { ignoreDuplicates: true }), "picks");

  // 5. Results, XP, badges.
  await must(db.from("race_results").upsert(s.results.map((r) => ({ id: r.id, race_id: r.raceId, lineup_id: r.lineupId, user_id: uid(r.userId), ai_profile_id: r.aiProfileId, race_score: r.raceScore, leader_points: r.leaderPoints, challenger_points: r.challengerPoints, wildcard_points: r.wildcardPoints, leader_finish: r.leaderFinish, challenger_finish: r.challengerFinish, wildcard_finish: r.wildcardFinish, wildcard_start: r.wildcardStart, leader_hit: r.leaderHit, challenger_hit: r.challengerHit, wildcard_hit: r.wildcardHit, best_role: r.bestRole, xp_awarded: r.xpAwarded, rank: r.rank, settled_at: r.settledAt, formula_version: r.formulaVersion }))), "results");
  await must(db.from("xp_ledger").upsert(s.xp.map((e) => ({ id: e.id, user_id: uid(e.userId), race_id: e.raceId, reason: e.reason, amount: e.amount, created_at: e.createdAt, idempotency_key: e.idempotencyKey.replace(e.userId, uid(e.userId)!) })), { onConflict: "idempotency_key", ignoreDuplicates: true }), "xp");
  await must(db.from("user_badges").upsert(s.userBadges.map((b) => ({ user_id: uid(b.userId), badge_code: b.badgeCode, awarded_at: b.awardedAt, race_id: b.raceId })), { ignoreDuplicates: true }), "user badges");

  console.log(`Seeded ${s.races.length} races, ${s.snapshots.length} snapshots, ${s.lineups.length} lineups, ${s.results.length} results, ${DEMO_USERS.length} demo users.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
