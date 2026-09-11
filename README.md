# SHIPTRACE

**Crypto makes promises. SHIPTRACE checks what gets delivered.**

SHIPTRACE turns public crypto roadmaps into trackable commitments. Follow deadlines, inspect evidence, and compare documented delivery history across projects.

It is an evidence-based product-delivery tracker. It is **not** an investment-rating service: it never executes trades, sells tokens, predicts returns, connects wallets, or labels projects fraudulent.

> SHIPTRACE tracks publicly available project commitments and evidence. A Ship Score is not an investment recommendation, security audit, legal conclusion, or guarantee of future delivery.

---

## Contents

1. [Product overview](#product-overview)
2. [Editorial and safety rules](#editorial-and-safety-rules)
3. [Stack and architecture](#stack-and-architecture)
4. [Quick start (Demo Mode)](#quick-start-demo-mode)
5. [Demo Mode walkthrough](#demo-mode-walkthrough)
6. [Environment variables](#environment-variables)
7. [Supabase: migrations and seeding](#supabase-migrations-and-seeding)
8. [Authentication and roles](#authentication-and-roles)
9. [Ship Score](#ship-score)
10. [Integrations and scheduled jobs](#integrations-and-scheduled-jobs)
11. [Moderation](#moderation)
12. [Security](#security)
13. [Tests and verification](#tests-and-verification)
14. [Deployment (Vercel)](#deployment-vercel)
15. [Routes](#routes)
16. [Known limitations](#known-limitations)

---

## Product overview

For every tracked project SHIPTRACE records what was publicly promised (as a short paraphrase with the original source URL and access timestamp), the deadline, the evidence offered, and the final status:

`planned → in_progress → submitted_for_review → shipped | partially_shipped | delayed | no_evidence | cancelled | disputed`

Each project receives a transparent, versioned **Ship Score** (0–100) based on milestone delivery, development continuity, product availability, transparency, and evidence quality — or shows **Insufficient data** when the minimum data does not exist.

Core loop: *Discover project → Read commitments → Inspect evidence → Follow deadline → Submit evidence → Moderation → Status update → Ship Score changes.*

## Editorial and safety rules

- Every factual status requires a source URL and access timestamp.
- Project claims, community submissions, automated observations, and moderator conclusions are labelled separately everywhere.
- A project is never called a scam, fraud, rug, or criminal based on inactivity or a low score. The neutral phrasing is *"No qualifying evidence found as of [date]"*.
- Every project has a visible correction/dispute pathway; prior decisions stay in the audit history.
- No personalised investment recommendations, wallet connection, trading, swaps, price targets, token sale, staking, or financial rewards.
- Automated scoring is explainable and versioned; repository, product, uptime, social, and roadmap data are never fabricated. Demo Mode data is clearly labelled fictional.

## Stack and architecture

- **Next.js 16 (App Router), React 19, TypeScript strict**, Server Components by default, Server Actions for mutations.
- **Tailwind CSS 4** with the SHIPTRACE palette defined as theme tokens in `src/app/globals.css`.
- **Supabase** (Postgres + Auth) with Row Level Security; **Zod** validation on every server action.
- **Recharts** for score history, **Lucide** icons.
- **Vitest** unit tests, **Playwright** smoke tests.
- Vercel-compatible scheduled jobs under `/api/cron/*`.

```
src/
  app/                    Routes (see Routes below), layout, error/not-found/loading boundaries
  components/             Design system + product components (ProjectCard, ShipScoreGauge, ScoreBreakdown,
                          MilestoneTimeline, MilestoneCard, EvidenceCard, SourceChip, StatusHistory,
                          ShippingFeed, CompareTable, DeadlineCalendar, SubmissionForm, ModerationQueue,
                          ProofCard, DataFreshness, DemoBadge, Disclaimer, ConfidenceBadge, ProjectSearch …)
  lib/
    domain/               Pure domain logic: types, Ship Score formulas, status workflow, evidence hierarchy,
                          URL safety, authorization, rate limiting, Zod schemas
    data/                 DataSource interface + DemoDataSource (in-memory) + SupabaseDataSource
    demo/                 Declarative fictional dataset (spec.ts) and deterministic seed expander (seed.ts)
    providers/            Integration abstractions: GitHub metadata, website health
    services/             Score recalculation, cron job runners
    actions/              Server Actions: auth, submissions, watchlist, moderation
    session.ts            Current user (demo persona cookie or Supabase auth + profile)
    config.ts             Environment parsing; decides Demo Mode
supabase/
  migrations/0001_init.sql   Schema (20+ tables), immutability triggers, helper functions
  migrations/0002_rls.sql    Row Level Security policies
  seed.sql                   Generated fictional seed (npm run db:seed:generate)
scripts/generate-seed-sql.ts Generates supabase/seed.sql from the Demo Mode spec
tests/unit                   Vitest
tests/e2e                    Playwright smoke tests
```

**Data source abstraction.** All pages and actions talk to a single `DataSource` interface (`src/lib/data/types.ts`). `getDataSource()` returns the in-memory `DemoDataSource` when Demo Mode is active, otherwise `SupabaseDataSource`. Both share the same summary/filter/sort logic (`src/lib/data/summaries.ts`) and the same score engine.

## Quick start (Demo Mode)

Requirements: Node 20+ (tested on Node 22) and npm.

```bash
npm install
cp .env.example .env.local      # defaults already enable Demo Mode
npm run dev                      # http://localhost:3000
```

Production build and run:

```bash
npm run build
npm start                        # http://localhost:3000
```

No external services are needed. Missing Supabase/GitHub keys activate clearly labelled Demo Mode instead of breaking anything.

## Demo Mode walkthrough

Demo Mode seeds **12 fictional projects** (all on the reserved `.example` TLD) with 65 milestones across every status, 52 evidence records, three disputes, six contributors, 12 weeks of repository observations, 30 website checks per endpoint, and six months of score history (the two oldest snapshots use the legacy formula `v0.9.0`). The footer carries a discreet sample-dataset note. Data lives in server memory and resets on restart.

**User loop**

1. Open `/login` → *Continue as guest*.
2. Go to `/projects/quillswap` → milestone *Fee switch governance vote* → **Submit evidence**.
3. Submit a URL such as `https://quillswap.example/blog/fee-switch-vote` with a title and explanation. The result page links to its Proof Card, which shows *Pending moderation · unverified*. The milestone moves to *Submitted for review*; its verified status is unchanged.
4. Use **Request correction** on any milestone to file a correction/dispute (e.g. the open one on Nimbus Wallet's *In-app transaction simulation*).
5. Follow projects with the **Follow** button and view `/watchlist`.

**Moderator loop**

1. `/login` → *Continue as moderator* → `/admin`.
2. **Evidence queue**: accept the pending *Fee upgrade activation notice* (Tessera Rollup) with a reason. It appears under *Recently decided* and the project's Ship Score is recalculated.
3. Open `/projects/tessera-rollup/milestones/ms_tessera_rollup_fee_upgrade` → **Change verified status** → *Shipped*, select the accepted evidence, give a reason. A status event with an audit ID is appended and the score is recalculated. Shipped items appear in `/shipping-feed`.
4. **Disputes** tab: resolve the open Nimbus Wallet dispute or the Hollowmere Realms correction request.
5. **Scores** tab: recalculate with `v1.0.0` or the legacy `v0.9.0`; snapshots are appended, never rewritten.
6. **Audit log** tab shows every decision with actor, reason and before/after state.

*Continue as admin* additionally exposes the Integrations panel.

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project. If missing, Demo Mode is active. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes from server actions and cron jobs. Never exposed to the browser. If absent, writes go through the user client and RLS. |
| `GITHUB_TOKEN` | Enables the GitHub metadata provider. |
| `WEBSITE_CHECK_SECRET` | Enables the website health provider (any non-empty value; acts as an explicit opt-in). |
| `ADMIN_EMAILS` | Comma-separated emails granted the `admin` role at sign-in. |
| `CRON_SECRET` | Bearer secret required by `/api/cron/*`. |
| `NEXT_PUBLIC_APP_URL` | Absolute URL for share links, sitemap and Open Graph. Optional on Vercel, where the deployment hostname is detected automatically. |
| `NEXT_PUBLIC_DEMO_MODE` | `true` forces Demo Mode even when Supabase is configured. |

## Supabase: migrations and seeding

1. Create a Supabase project and enable email/password auth.
2. Apply migrations in order (Supabase CLI or SQL editor):
   ```bash
   supabase db push            # applies supabase/migrations/0001_init.sql and 0002_rls.sql
   # or: psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql -f supabase/migrations/0002_rls.sql
   ```
3. Optional fictional seed for staging:
   ```bash
   npm run db:seed:generate    # regenerates supabase/seed.sql from the Demo spec (dates relative to today)
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
   The seed inserts placeholder `auth.users` rows for the fictional contributors (they cannot sign in). Remove them before launching with real users.
4. Set the Supabase variables, set `NEXT_PUBLIC_DEMO_MODE=false`, and restart.

Schema highlights: text primary keys shared with Demo Mode; `milestone_status_events`, `evidence_reviews`, `ship_score_snapshots` and `admin_audit_log` have triggers that reject `UPDATE`/`DELETE`; `github_snapshots` and `website_checks` carry unique constraints that make scheduled jobs idempotent (one snapshot per repository per day, one check per endpoint per 10-minute bucket); `profiles` are created automatically from `auth.users`.

## Authentication and roles

- **Supabase mode:** email/password sign-up and sign-in via `@supabase/ssr`; `src/proxy.ts` refreshes sessions. Roles come from `profiles.role`; emails in `ADMIN_EMAILS` are elevated to `admin`.
- **Demo Mode:** `/login` offers three fictional personas (guest, moderator, admin) stored in an HTTP-only cookie.
- Roles: `guest` (read-only), `user` (submit evidence/disputes, watchlist, votes), `moderator` (review, status changes, disputes, projects, recalculation), `admin` (plus integrations). Permissions are defined in `src/lib/domain/auth.ts` and enforced in every server action; `/admin` redirects non-moderators server-side before loading data.

## Ship Score

```
ship_score = delivery×0.40 + development×0.20 + availability×0.15 + transparency×0.15 + evidence×0.10
```

- **Delivery** counts only moderator-approved milestones whose deadlines have passed, importance-weighted (core ×3, major ×2, minor ×1). Credits: shipped on time 100, late 70, partial 40, delayed with updated explanation 25, delayed without 0, no evidence 0, cancelled with explanation excluded (shown separately), cancelled without explanation 0, disputed excluded. Minimum three counted milestones.
- **Development** uses active weeks, release/tag cadence and push recency — never raw commit counts as proof.
- **Availability** is the rolling success rate of the last 30 checks per approved endpoint.
- **Transparency** uses dated roadmap updates, explanation rate, public docs and change disclosure.
- **Evidence quality** weights accepted evidence by the hierarchy (product/release 1.0, repository release 0.85, official announcement 0.65, independent reporting 0.5, community observation 0.25) and completeness.
- A total is shown only when the delivery component exists and ≥60% of formula weight is available; otherwise **Insufficient data**. Missing components are excluded and the total is renormalised over available weight.
- Every snapshot stores components, total, confidence, data completeness, formula version, calculation time and a human-readable explanation. Formulas are versioned in `src/lib/domain/score.ts` (`v1.0.0` current, `v0.9.0` legacy); admins choose the version when recalculating. History is append-only.

The full method is published at `/methodology`.

## Integrations and scheduled jobs

Provider abstractions live in `src/lib/providers`. Each exposes `isConfigured()` and returns timestamped observations; observations never change verified status.

- **GitHub** (`GITHUB_TOKEN`): repository metadata, releases, tags, activity weeks, default branch, last push; cached 6h via the Next fetch cache; one snapshot per repository per UTC day.
- **Website health** (`WEBSITE_CHECK_SECRET`): GET only approved public URLs (validated against private ranges), 10s timeout, stores HTTP status/latency/error; one check per endpoint per 10-minute bucket.

Cron routes (all require `Authorization: Bearer $CRON_SECRET`):

| Route | Schedule (`vercel.json`) | Job |
| --- | --- | --- |
| `/api/cron/github` | daily 03:00 UTC (Hobby-compatible; raise on Pro) | fetch repository snapshots |
| `/api/cron/website` | daily 04:00 UTC | check approved endpoints |
| `/api/cron/scores` | daily 05:00 UTC | recalculate all published projects |

Run manually: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/scores`.

## Moderation

- Community submissions are stored as `pending` and shown as visibly unverified (Proof Cards, Evidence Rooms, feed).
- Accept / reject / request clarification require a reason; every decision writes `evidence_reviews` and `admin_audit_log`.
- Status changes follow the transition table in `src/lib/domain/status.ts`, require a reason (≥10 chars), and delivery statuses require accepted evidence references. Each change appends an immutable `milestone_status_events` row with actor, reason, evidence IDs, prior/new status and an audit ID, then recalculates the score.
- Disputes/corrections can be filed by anyone signed in (including project representatives, who may disclose a conflict of interest). Disputed milestones are excluded from scoring until resolved; resolutions are public and history is preserved.
- Milestones must be moderator-approved to count toward scores, preventing trivial milestone inflation.
- Nothing material is ever deleted; the admin UI has no delete actions for history.

## Security

- Zod validation for every server action; URLs validated server-side (http/https only, no credentials, no localhost/private ranges).
- Submitted text is sanitised (control characters stripped) and rendered as text only — never as HTML.
- External links use `rel="noopener noreferrer nofollow ugc"` and `target="_blank"`.
- In-memory sliding-window rate limits on submissions (5 per 10 minutes per user) and votes; honeypot field on forms.
- Authorization checked in every action via role permissions; `/admin` protected server-side; RLS as defence in depth.
- Security headers (`nosniff`, `X-Frame-Options: DENY`, referrer and permissions policies) in `next.config.ts`; `poweredByHeader` disabled.
- Service-role key used only on the server; browser only ever sees the anon key.

## Tests and verification

```bash
npm run lint          # ESLint (next/core-web-vitals + TypeScript)
npm run typecheck     # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm test              # Vitest unit tests
npm run build         # production build
npm run test:e2e      # Playwright smoke tests (builds must exist; starts `next start` on port 3100)
npm run verify        # lint + typecheck + unit tests + build
```

Unit tests cover the Ship Score formula and weights, insufficient-data threshold, on-time/late/partial credit, disputed exclusion, importance weighting, evidence hierarchy, status transition validation, score versioning, URL validation, moderation authorization, watchlist ownership, rate limiting, idempotent scheduled checks, and the demo moderation loop.

Smoke tests cover the homepage and search, project profile, compare flow, demo evidence submission staying pending, moderator status update creating an audit event, score explanation matching the calculation, an ordinary user being rejected from `/admin`, the watchlist having no trading UI, and the mobile layout.

## Deployment (Vercel)

1. Import the repository in Vercel (framework: Next.js). `vercel.json` registers the cron schedules.
2. Set the environment variables above (at minimum `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`; Supabase variables for production; `NEXT_PUBLIC_DEMO_MODE=false`).
3. Apply the Supabase migrations before the first deploy.
4. Deploy. Cron jobs call the routes with the Vercel-managed `CRON_SECRET` bearer header.

A deployment without Supabase variables runs in Demo Mode and is safe to share as a demo.

## Routes

| Route | Description |
| --- | --- |
| `/` | Homepage: hero, latest verified shipments, due this week, most consistent shippers, delayed/no-evidence items, score explanation, trending comparisons, community activity |
| `/projects` | Directory with search and filters (category, ecosystem, milestone status, score band, evidence recency, development activity) and explicit sorting |
| `/projects/[slug]` | Profile: score breakdown and history, timeline, upcoming/shipped/attention items, development pulse, product status, evidence feed, change log, methodology and corrections |
| `/projects/[slug]/milestones/[id]` | Evidence Room: commitment, source, deadline, moderator conclusion, ranked evidence, pending submissions, status history, disputes, moderator status tools |
| `/compare` | Compare up to three projects |
| `/shipping-feed` | Filterable chronological verified events |
| `/deadlines` | Commitments due this week/month/past, grouped by status or project |
| `/proof/[evidenceId]` | Shareable Proof Card with Open Graph image, copy link and X share |
| `/watchlist` | Followed projects, approaching deadlines, score changes, activity |
| `/submit` | Evidence, correction, or project suggestion forms |
| `/methodology`, `/token`, `/about` | Published method, future-utility information, product overview |
| `/privacy`, `/terms` | Privacy Policy and Terms of Use (operator details in `src/components/LegalLayout.tsx`) |
| `/profile/[username]` | Public contributor profile |
| `/admin` | Moderation and admin workspace (server-protected) |
| `/login`, `/signup` | Authentication (demo personas in Demo Mode) |
| `/api/cron/{github,website,scores}` | Scheduled jobs |

## Known limitations

- Demo Mode state is in-process memory: it resets on restart and is not shared between serverless instances. Use Supabase for persistence.
- The in-memory rate limiter is per instance; multi-region deployments should swap in a shared store behind the same interface.
- `SupabaseDataSource` is implemented against the migrations but has not been exercised against a live Supabase project in this environment; run the smoke tests against staging after applying migrations.
- Transparency inputs (dated updates, explanation rate, docs, change disclosure) are recorded by moderators in the database; there is no admin form for them yet.
- Project links, repositories and endpoints are managed in the database rather than in the admin UI.
- The GitHub provider counts tags only when they match dated releases (the tags endpoint provides no dates).
- Contributor badges are seeded/awarded in the database; automatic badge awarding is not implemented.
- The brand mark in `public/brand/shiptrace-mark.svg` is a vector approximation of the supplied logo; replace it with the official export if desired.

