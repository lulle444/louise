# META RACE

**Predict the next crypto narrative before the crowd.**

META RACE is an educational forecasting game using virtual points. Every week nine crypto narratives (AI, RWA, Gaming, DeFi, DePIN, Layer 2, Privacy, SocialFi, Memecoins) line up in a Race. Players draft a **Leader**, a **Challenger** and a **Wildcard**, allocate exactly **100 virtual Energy Points**, and lock before the deadline. Narrative Scores update from transparent market metrics; at settlement players earn XP, streaks, badges and an evolving **Meta DNA** profile while competing against three rule-based AI coaches and the crowd consensus.

> META RACE is an educational forecasting game using virtual points. It does not execute trades or provide financial advice. Crypto markets are volatile, and past game performance does not predict future results.

No deposits, wagers, prizes, token stakes, wallets, swaps or trade execution exist anywhere in the product.

## Stack

- Next.js 16 (App Router, Server Components by default), TypeScript strict
- Tailwind CSS v4
- Supabase Postgres + Auth (optional — Demo Mode runs without it)
- Zod validation on every server boundary
- Recharts, Lucide icons
- Vitest (unit) and Playwright (smoke)
- Vercel-compatible, with scheduled snapshot/settlement crons in `vercel.json`

## Quick start (Demo Mode, no keys)

```bash
npm install
npm run dev
# open http://localhost:3000
```

Without Supabase credentials the app automatically runs in **Demo Mode**: a deterministic in-memory world with four settled Races, one live Race, one open Race, nine narratives, 14 demo players, AI and crowd lineups, results, XP and badges. Every demo value is labelled *Demo data*.

### Demo Mode walkthrough

1. Open `/` — live standings, current Race, AI vs Crowd, top players.
2. Click **Build My Lineup** (or go to `/race` and open the Race marked *Open for lineups*).
3. Click **Continue as guest to lock** → *Start a guest session*. Guest state lives in an HTTP-only cookie in your browser.
4. Pick three narratives (click assigns to the highlighted role), allocate 100 Energy, add an optional thesis, **Lock lineup** and confirm.
5. Crowd Picks are revealed only after you lock. Your lineup is immutable; the builder disappears.
6. Open **View Race Card** for the public card with a Share-on-X link.
7. To fast-forward the loop: `/login` → **Enter demo admin** → `/admin`. Use **Go live** on the open Race, then **Settle**. Return to the Race page to see your result, XP and placement; open your profile for badges and Meta DNA.

Demo Mode admin changes are kept in server memory and reset when the process restarts (and the timeline is rebuilt each UTC day so a live Race always exists).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (`tests/unit`) |
| `npm run test:e2e` | Playwright smoke tests (`tests/e2e`; builds must exist: run `npm run build` first) |
| `npm run verify` | lint + typecheck + unit tests + build |
| `npm run seed:supabase` | Seed a Supabase project with the demo world (needs service-role key) |

Playwright uses the bundled Chromium; if you have a system Chromium set `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome`.

## Environment variables

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key (RLS applies)
SUPABASE_SERVICE_ROLE_KEY=       # Server-only: snapshots, settlement, AI lineups, audit log
MARKET_DATA_API_KEY=             # CoinGecko demo/pro key for live market data
ADMIN_EMAILS=                    # Comma-separated emails granted /admin
CRON_SECRET=                     # Bearer token required by /api/cron/*
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true       # Force Demo Mode; automatically on when Supabase keys are missing
```

Required for production: all of the above with `NEXT_PUBLIC_DEMO_MODE=false`.

## Architecture

```
src/
  app/                    Routes (App Router). Server Components; client islands for the
                          lineup builder, countdown, track animation, charts and tooltips.
  components/             AppHeader, RaceHero, NarrativeCard, NarrativeTrack, LineupBuilder,
                          EnergyAllocator, RaceCountdown, CrowdPicks, AICoachCard, MetaDNAChart,
                          Leaderboard, RaceCard, MethodologyTooltip, DemoBadge, ErrorState,
                          EmptyState, Disclaimer, …
  lib/
    scoring/              Pure, tested game logic: narrative score + normalization, race score,
                          XP + idempotent ledger, levels, badges, crowd aggregation, AI coaches,
                          Meta Rating / Meta DNA, Zod lineup validation.
    data/                 MarketDataProvider interface, deterministic mock provider, CoinGecko
                          provider, snapshot computation (capped weighting, missing-data rules).
    services/             Snapshot taking, AI lineup locking, idempotent settlement, void,
                          cron jobs, and page view-models.
    store/                DataStore interface + DemoStore (in-memory), SupabaseStore,
                          GuestOverlayStore (cookie-backed guest lineups in Demo Mode).
    demo/                 Narrative catalogue, demo users, deterministic world builder.
    auth/                 Session resolution (Supabase or guest cookie), admin guard, cron auth.
supabase/migrations/      0001_schema.sql (tables, constraints, triggers, lock_lineup RPC),
                          0002_rls.sql (row level security)
supabase/seed.sql         Catalogue seed (AI profiles, badges)
scripts/seed-supabase.ts  Full demo-world seeder
tests/unit, tests/e2e     Vitest and Playwright
legacy/terratamers/       Previous static game kept in the repository for reference (not built)
```

### Rules enforced server-side and in the database

- One lineup per user per Race (`unique (race_id, user_id)`)
- Three picks, one per role, three different narratives (`lineup_picks` primary key + unique)
- Energy is non-negative integers totalling exactly 100 (deferred constraint trigger)
- Lineups accepted only while the Race is `published` and strictly before `locks_at`
- Locked lineups are immutable (update/delete triggers) — only `status` changes at settlement/void
- Snapshots, settlement, XP, badges and AI lineups are written by the service role only
- Public reads are limited to non-draft Races; other players' lineups are visible only after the Race locks (or after you have locked your own)
- Users may update only `display_name`, `bio` and `avatar_seed` on their own profile

### Routes

`/`, `/race`, `/race/[raceId]`, `/narratives`, `/narratives/[slug]`, `/ai-vs-crowd`, `/leaderboard`, `/profile/[username]`, `/lineup/[lineupId]`, `/token`, `/methodology`, `/admin`, `/login`, `/signup`, `/api/cron/snapshot`, `/api/cron/settle`, `/api/health`.

## Scoring (summary — full text on `/methodology`)

- **Narrative Score** = price 40% + breadth 25% + volume 20% + momentum 15%, each normalized 0–100 with published bounds. Constituent weights are equal and capped at 35%.
- **Race Score**: Leader 1st 100 (2nd 40, 3rd 20); Challenger top-3 60 (4th 20); Wildcard 20 per position gained vs its pre-lock rank, max 80. `role_points = min(cap, base × (0.5 + energy/100))`, caps 150/90/120, max 360.
- **XP**: lock +10, Leader correct +100, Challenger top 3 +40, Wildcard up +60, three-Race participation streak +25, three correct Leaders +50. Levels: Observer 0, Scout 250, Analyst 750, Strategist 1500, Meta Hunter 3000, Navigator 6000.
- **Meta Rating** = avg score × 4 + leader accuracy × 300 + challenger accuracy × 150 + wildcard accuracy × 150; provisional under three settled Races.

## Supabase setup

1. Create a project, enable email auth.
2. Apply migrations in order (Supabase SQL editor or CLI):
   ```bash
   supabase db push            # or paste supabase/migrations/0001_schema.sql then 0002_rls.sql
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
3. Optionally seed the full demo world (creates 14 demo auth users with password `metarace-demo`):
   ```bash
   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run seed:supabase
   ```
4. Set the env vars, `NEXT_PUBLIC_DEMO_MODE=false`, and list admin emails in `ADMIN_EMAILS`.

Human lineups are inserted through the `lock_lineup()` RPC (security definer) which re-checks every rule in SQL.

## Data provider, cron and settlement

`MarketDataProvider.getSeries(symbol, from, to)` returns `(t, close, volume)` points. The mock provider is a seeded random walk at six-hour steps (deterministic per symbol and timestamp). The CoinGecko provider is used when `MARKET_DATA_API_KEY` is set and Demo Mode is off; results are cached for ten minutes and validated as finite, positive numbers. A narrative with data for fewer than 60% of its constituents is marked *unavailable* rather than estimated.

Scheduled jobs (`vercel.json`) call:

- `GET /api/cron/snapshot` daily at 00:00 UTC (Hobby plan allows daily crons only; raise to every 6h on Pro) — locks AI lineups and takes published Races live at their lock time, records interval snapshots for live Races and the final snapshot when the window ends.
- `GET /api/cron/settle` daily at 00:30 UTC — settles live Races whose window has ended. Settlement is idempotent: results are keyed by lineup, XP by `(user, race, reason)`.

Both require `Authorization: Bearer $CRON_SECRET`. Admins can trigger the same actions from `/admin`.

## Admin

`/admin` is protected server-side: the page checks the session before rendering anything and shows a 403 state to non-admins. In production, admins are the emails in `ADMIN_EMAILS`. Admins can create / publish / go live / snapshot / settle / void / archive / feature Races, edit narratives, create new constituent versions (blocked during a live Race), inspect snapshots and data errors, and read the audit log.

## Tests

- **Unit** (`tests/unit`): lineup validation (roles, uniqueness, exactly 100 Energy, deadline), narrative score formula and normalization bounds, Leader/Challenger/Wildcard scoring and caps, XP idempotency and streaks, crowd aggregation excluding AI, Meta Rating threshold, AI coach rules, and a full demo-world build covering settlement idempotency, deadline/duplicate rejection and void behaviour.
- **Smoke** (`tests/e2e`): homepage, Race list, guest lineup lock with hidden → revealed crowd, settled Race view, leaderboard/profile/narrative pages, admin rejection and demo-admin access, cron authorization, and the full loop (lock → go live → settle → result).

## Deployment (Vercel)

1. Import the repository; framework preset Next.js.
2. Add the environment variables above (Demo Mode works with none of them).
3. `vercel.json` registers the two cron jobs; Vercel sends `CRON_SECRET` automatically as the bearer token.

## Limitations

- Demo Mode is in-memory per server process. On serverless platforms admin changes and guest-visible mutations may not persist across instances; guest lineups live in the guest's cookie and their Race Card links are only viewable by that guest.
- The Supabase store and SQL migrations were written against the documented schema but have not been exercised against a live Supabase project in this environment.
- Demo market data is synthetic and says nothing about real markets. The CoinGecko provider depends on public API rate limits and revision policy.
- Narrative membership is editorial; six-hour snapshots miss intra-interval moves.
- No native apps, smart contracts, DAO, or social-media scraping.
