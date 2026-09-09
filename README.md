# SIGNAL ARENA

**Pick your signals. Challenge the AI. Prove your edge.**
Humans vs AI. Who reads crypto markets best?

SIGNAL ARENA is a competitive crypto-intelligence platform where humans, three fictional AI analyst profiles, and the aggregated crowd face the same daily market forecasting challenges ("Market Battles"). Pick a direction, cite exactly three signals, set your confidence, lock your forecast, and build a transparent, timestamped track record using **virtual points only**.

> SIGNAL ARENA is an educational forecasting game using virtual points. It does not execute trades or provide financial advice. Crypto markets are volatile, and past forecasting performance does not predict future results.

---

## Features

- **Daily Market Battles** on BTC, ETH and SOL with explicit lifecycle states (`draft → upcoming → open → locked → settling → settled | void | archived`).
- **Prediction composer**: Bullish / Neutral / Bearish, exactly three unique signals, confidence 1–5, optional 240-character thesis, Signal Card preview, confirmation dialog, immutable lock.
- **Crowd Signal** hidden until the viewer locks (or the Battle closes); AI positions revealed under the same rule. AI forecasts are never counted in the crowd.
- **Three rule-based AI analysts** (ORACLE, VECTOR, ECHO) that lock forecasts before the deadline with a stored strategy version and input snapshot. They are deterministic simulations, not commercial AI models.
- **Automatic, idempotent settlement** from an authoritative end-price snapshot with configurable neutral threshold, XP ledger, streaks, levels and badges.
- **Humans vs AI** scoreboard, 7/30-day accuracy, per-Battle trend chart, biggest disagreement, best-performing signal.
- **Leaderboard** with week/month/all-time and per-asset filters, transparent Arena rating, minimum-sample ranking rule.
- **Public profiles** with Signal DNA (radar + text), performance by asset/signal, badges and historical Signal Cards.
- **Shareable Signal Cards** (`/signal/[id]`) with copy-link, share-on-X and a dynamic Open Graph image.
- **Admin console** (`/admin`, server-authorized): create/publish/lock/settle/void/archive Battles, inspect price snapshots and settlement errors, toggle AI profiles, manual audited price override, health view and audit log.
- **Demo Mode** with deterministic seeded data (23 settled Battles, 1 live, 2 upcoming, 1 void, 15 analysts) that exercises the exact same services as production.
- Loading, empty, error, void and "data unavailable" states; keyboard/screen-reader support; `prefers-reduced-motion` respected; mobile-first layout.

Explicitly **not** included (by design): wallets, deposits, stakes, prizes, token sales, trading, leverage, portfolio linking, copy trading, on-chain writes.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, Lucide icons, Recharts |
| Data / auth | Supabase (Postgres + email/password auth) with Row Level Security; in-memory seeded store in Demo Mode |
| Validation | Zod (shared between UI, actions and admin) |
| Market data | Provider abstraction: CoinGecko in production, deterministic simulator in Demo Mode |
| Tests | Vitest (domain + services), Playwright (end-to-end smoke suite) |
| Deploy | Vercel-compatible (`vercel.json` cron for settlement) |

## Quick start (Demo Mode, no credentials)

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_DEMO_MODE=true by default
npm run dev                    # http://localhost:3000
```

Demo Mode activates when `NEXT_PUBLIC_DEMO_MODE=true` **or** when Supabase credentials are absent. A tasteful "Demo data" indicator is shown and all prices are labelled as simulated.

### Demo sign-in

Go to **/login** and choose one of:

| Identity | What you get |
|---|---|
| **Continue as guest** | Fresh account. Enter the live Battle, lock a forecast, watch the crowd and AI positions reveal, view your public Signal Card. |
| **Nova Reyes (analyst)** | Seeded history: settled results, XP/level, streaks, badges, Signal DNA, leaderboard placement. |
| **Arena Admin** | Opens the protected `/admin` console. |

Guest/analyst forecasts locked in Demo Mode are kept in server memory and mirrored into an httpOnly cookie so the locked state survives serverless cold starts. Admin changes in Demo Mode live in server memory and reset on restart.

## Project structure

```
src/
  app/                    routes (App Router)
    arena/[battleId]      Battle detail: composer, lock flow, crowd, AI, settlement result
    signal/[predictionId] public Signal Card + opengraph-image
    admin                 protected Battle console
    api/cron/settle       scheduled settlement (CRON_SECRET)
    api/health            provider / mode status
  components/             UI: layout, arena, charts, profile, ui primitives
  lib/
    config.ts             env + demo-mode detection, thresholds, disclaimer
    domain/               pure logic: settlement, scoring, crowd, DNA, badges, AI strategies, validation
    services/             lifecycle, predictions, settlement, AI generation, stats, cron
    data/                 ArenaRepository interface; demo (seed + in-memory) and supabase implementations
    market/               MarketDataProvider: mock + CoinGecko
    auth/                 viewer resolution (Supabase session or demo cookie)
    actions/              Server Actions (predictions, admin, auth, profile)
  proxy.ts                Supabase session refresh (no-op in Demo Mode)
supabase/
  migrations/0001_init.sql  schema, triggers, RLS policies, lock_prediction RPC
  seed.sql                  catalogue seed (assets, signals, AI profiles, badges, levels)
e2e/                      Playwright smoke suite
legacy/terratamers/       unrelated static game that previously lived in this repo (preserved, not built)
```

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Leave empty for Demo Mode. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe for the browser; RLS applies). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Used for settlement, AI forecasts, XP/badges and admin writes. Never exposed to the client bundle. |
| `MARKET_DATA_API_KEY` | Optional CoinGecko demo/pro key. The public endpoint works without one (rate-limited). |
| `ADMIN_EMAILS` | Comma-separated emails granted admin access (in addition to `profiles.is_admin`). |
| `CRON_SECRET` | Bearer secret for `/api/cron/settle`. Vercel Cron sends it automatically. |
| `NEXT_PUBLIC_APP_URL` | Public URL for absolute links, share links and OG images. |
| `NEXT_PUBLIC_DEMO_MODE` | `true` forces Demo Mode; `false` uses Supabase when credentials exist. |

## Supabase setup (production mode)

1. Create a Supabase project. In **Authentication → Providers** enable Email (password sign-in). Set the Site URL to your app URL and add `<app-url>/auth/callback` to the redirect list.
2. Apply the schema and seed:
   ```bash
   # with the Supabase CLI linked to your project
   supabase db push                       # applies supabase/migrations/0001_init.sql
   psql "$DATABASE_URL" -f supabase/seed.sql
   # or paste both files into the SQL editor, migration first
   ```
3. Fill `.env.local` with the project URL, anon key and service-role key, set `NEXT_PUBLIC_DEMO_MODE=false`, and set `ADMIN_EMAILS` (or flip `profiles.is_admin` for your user).
4. `npm run dev`, sign up at `/signup` (a `profiles` row is created by trigger), then create and publish the first Battle from `/admin`.

### Security model

- RLS is enabled on every table. The public can read published Battles, profiles, badges and settled results. Other analysts' predictions and AI forecasts in an *open* Battle are readable only once the viewer has locked their own (`can_view_battle_positions`).
- Users lock predictions through the `lock_prediction` RPC (validates the open window, exactly three unique active signals, confidence 1–5, thesis length, one per user per Battle) or the guarded insert policy. Triggers make locked forecasts immutable and enforce the three-signal count at commit.
- Scoring writes (battles, ai_predictions, xp_ledger, user_badges, settlement_runs, price_snapshots, audit log) are only possible with the service role, which the app uses exclusively on the server.
- `/admin` and every admin Server Action check the viewer server-side (`profiles.is_admin` or `ADMIN_EMAILS`); hidden UI is never the authorization boundary.

## Market data provider

`src/lib/market/provider.ts` defines `MarketDataProvider` (`getCurrentPrice`, `getHistoricalPrice`, `getPriceSeries`). `getMarketDataProvider()` returns the deterministic simulator in Demo Mode and `CoinGeckoProvider` otherwise. Prices are validated (positive, finite), cached with short TTLs, and stored with the provider's timestamp and source. To use another provider, implement the interface and switch it in `src/lib/market/index.ts`.

## Settlement and cron

- `GET|POST /api/cron/settle` (header `Authorization: Bearer <CRON_SECRET>`) runs `runScheduledMaintenance`: captures start prices for Battles that have opened, locks AI forecasts before the deadline, and settles Battles past `ends_at`. `vercel.json` schedules it every 15 minutes.
- Manual settlement, voiding and an audited manual end-price override are available in `/admin`.
- Settlement is idempotent: the `settling` transition is a lock, `settlement_runs` records every attempt, and the XP ledger's unique `(user, battle, reason)` key prevents double awards.

## Scoring summary

- Outcome: `change = (end − start) / start × 100`; Bullish if `change > threshold`, Bearish if `change < −threshold`, otherwise Neutral (boundaries are Neutral).
- Battle Score: 100 correct / 0 incorrect; void excluded from accuracy.
- XP: +10 lock, +100 correct, +25 at a 3-streak, +50 at a 5-streak, +50 once for seven valid Battles.
- Arena rating: `accuracy% × 0.6 + min(settled/30,1) × 25 + min(streak/10,1) × 15`; ranked at ≥ 5 valid settled Battles.
- Full detail on `/methodology`.

## Scripts

```bash
npm run dev          # start dev server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest unit + service tests
npm run build        # production build
npm run start        # serve the production build
npm run test:e2e     # Playwright smoke suite (needs a prior `npm run build`; starts `next start` on :3100)
npm run check        # lint + typecheck + test + build
```

Playwright uses a pre-installed Chromium if `/opt/pw-browsers/chromium` (or `PLAYWRIGHT_CHROMIUM_PATH`) exists; otherwise run `npx playwright install chromium` once. Point the suite at a running server with `PLAYWRIGHT_BASE_URL=http://localhost:3000`.

## Deploying to Vercel

1. Import the repository. Framework preset: Next.js.
2. Add the environment variables above (`NEXT_PUBLIC_DEMO_MODE=false` for production, or `true` for a credential-free demo deployment).
3. Vercel Cron picks up `vercel.json` and calls `/api/cron/settle` with `CRON_SECRET`.
4. Set `NEXT_PUBLIC_APP_URL` to the deployed URL so share links and OG images are absolute.

## Safety and product limitations

- Virtual XP and reputation only. No deposits, stakes, wagers, prizes, tokens, leverage, trading or portfolio tracking exist anywhere in the product. `/token` is informational and marked as planned utility.
- AI profiles are rule-based simulations; their forecasts (and everyone else's) are educational, not financial advice.
- Track records are forecasting-game history, not verified investment performance.
- Demo Mode prices are simulated and labelled as such; the app never presents mock data as live. If a provider is unavailable the UI shows "Data temporarily unavailable".
- Known limitations: Demo Mode admin changes are in-memory; the Supabase code path is implemented against the shipped schema but was not exercised against a live project in this environment; CoinGecko public rate limits may require an API key under load.
