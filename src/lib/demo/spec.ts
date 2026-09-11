import type { EvidenceType, ImportanceTier, MilestoneStatus, ProjectCategory, ReviewState, TransparencySignals, ActorKind } from "@/lib/domain/types";

/**
 * Declarative specification for the fictional Demo Mode dataset.
 *
 * All projects, people, domains (.example TLD) and events are fictional and are
 * generated relative to "today" so the demo always shows live-looking
 * deadlines. Nothing here describes a real crypto project.
 */

export interface EvidenceSpec {
  type: EvidenceType;
  title: string;
  summary: string;
  path: string;
  /** Days ago the source was published. */
  publishedDaysAgo: number;
  reviewState?: ReviewState;
  reviewReason?: string;
  submitter?: string; // username
  submitterKind?: ActorKind;
  support?: number;
  challenge?: number;
  conflictOfInterest?: string;
}

export interface MilestoneSpec {
  key: string;
  title: string;
  paraphrase: string;
  importance: ImportanceTier;
  sourcePath: string;
  claimDaysAgo: number;
  /** Deadline relative to today (negative = in the past). */
  deadlineInDays: number;
  /** If the deadline was moved, the original deadline relative to today. */
  originalDeadlineInDays?: number;
  status: MilestoneStatus;
  /** For shipped/partially shipped: delivery date relative to today. */
  deliveredInDays?: number;
  hasUpdatedExplanation?: boolean;
  moderatorNote?: string;
  approved?: boolean;
  evidence?: EvidenceSpec[];
  /** Whether this milestone was previously disputed and then resolved. */
  previouslyDisputed?: boolean;
}

export interface ProjectSpec {
  slug: string;
  name: string;
  category: ProjectCategory;
  ecosystem: string;
  description: string;
  domain: string;
  links: { label: string; path: string; kind: "website" | "docs" | "repository" | "social" | "app" | "other" }[];
  transparency: TransparencySignals;
  github?: { owner: string; repo: string; activeWeeks: number; releases90d: number; tags90d: number; lastPushDaysAgo: number; stars: number; latestTag: string };
  endpoints: { label: string; path: string; uptime: number }[];
  milestones: MilestoneSpec[];
  lastVerifiedDaysAgo: number;
}

export interface DisputeSpec {
  id: string;
  projectSlug: string;
  milestoneKey: string | null;
  evidenceIndex?: number;
  kind: "correction" | "dispute";
  submitter: string;
  submitterKind: ActorKind;
  claim: string;
  sourcePath: string | null;
  state: "open" | "under_review" | "resolved" | "rejected";
  resolution?: string;
  createdDaysAgo: number;
  resolvedDaysAgo?: number;
}

export interface UserSpec {
  id: string;
  username: string;
  displayName: string;
  role: "guest" | "user" | "moderator" | "admin";
  bio: string;
  watchlistPublic: boolean;
  badges: string[];
  createdDaysAgo: number;
  watchlist: string[];
}

export const DEMO_USERS: UserSpec[] = [
  {
    id: "user_demo_guest",
    username: "demo-guest",
    displayName: "Demo Guest",
    role: "user",
    bio: "Temporary demo account. Submissions made here are fictional and reset when the server restarts.",
    watchlistPublic: true,
    badges: [],
    createdDaysAgo: 1,
    watchlist: ["aurelia-chain", "tessera-rollup", "keelstone-oracle"],
  },
  {
    id: "user_demo_moderator",
    username: "mara-okafor",
    displayName: "Mara Okafor (demo moderator)",
    role: "moderator",
    bio: "Fictional moderator account used to demonstrate the review workflow.",
    watchlistPublic: false,
    badges: ["moderator", "primary-source"],
    createdDaysAgo: 400,
    watchlist: ["nimbus-wallet", "bridgeforge"],
  },
  {
    id: "user_demo_admin",
    username: "demo-admin",
    displayName: "Demo Admin",
    role: "admin",
    bio: "Fictional admin account for the integrations panel.",
    watchlistPublic: false,
    badges: ["moderator"],
    createdDaysAgo: 420,
    watchlist: [],
  },
  {
    id: "user_tomasz",
    username: "tomasz-rivera",
    displayName: "Tomasz Rivera",
    role: "user",
    bio: "Fictional contributor who tracks rollup and bridge releases.",
    watchlistPublic: true,
    badges: ["first-accepted", "primary-source"],
    createdDaysAgo: 300,
    watchlist: ["tessera-rollup", "bridgeforge", "lumen-data-grid"],
  },
  {
    id: "user_aiko",
    username: "aiko-tanaka",
    displayName: "Aiko Tanaka",
    role: "user",
    bio: "Fictional contributor focused on wallet and identity tooling.",
    watchlistPublic: false,
    badges: ["first-accepted", "helpful-correction"],
    createdDaysAgo: 220,
    watchlist: ["nimbus-wallet", "veritas-id"],
  },
  {
    id: "user_rep_hollowmere",
    username: "hollowmere-team",
    displayName: "Hollowmere Realms team (fictional project representative)",
    role: "user",
    bio: "Fictional project representative. Representatives can request corrections but cannot edit status or score.",
    watchlistPublic: false,
    badges: [],
    createdDaysAgo: 120,
    watchlist: ["hollowmere-realms"],
  },
];

export const DEMO_BADGES = [
  { slug: "first-accepted", name: "First accepted evidence", description: "Submitted evidence that a moderator accepted." },
  { slug: "primary-source", name: "Primary source finder", description: "Submitted accepted primary evidence (product, repository, or official documentation)." },
  { slug: "helpful-correction", name: "Helpful correction", description: "Filed a correction that led to a status update." },
  { slug: "moderator", name: "Moderator", description: "Reviews evidence and records status conclusions with reasons." },
];

export const DEMO_PROJECTS: ProjectSpec[] = [
  {
    slug: "aurelia-chain",
    name: "Aurelia Chain",
    category: "L1",
    ecosystem: "Aurelia",
    description: "Fictional proof-of-stake base layer with a published quarterly roadmap and open-source node software.",
    domain: "aurelia.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Docs", path: "/docs", kind: "docs" },
      { label: "Roadmap", path: "/roadmap", kind: "other" },
      { label: "Repository", path: "/repo", kind: "repository" },
    ],
    transparency: { datedRoadmapUpdates: 5, explanationRate: 1, hasPublicDocs: true, changeDisclosureRate: 0.9 },
    github: { owner: "aurelia-example", repo: "aurelia-node", activeWeeks: 11, releases90d: 3, tags90d: 1, lastPushDaysAgo: 2, stars: 1840, latestTag: "v1.6.0" },
    endpoints: [
      { label: "Explorer", path: "/explorer", uptime: 0.99 },
      { label: "Docs", path: "/docs", uptime: 0.995 },
    ],
    lastVerifiedDaysAgo: 1,
    milestones: [
      {
        key: "mainnet-beta",
        title: "Mainnet beta launch",
        paraphrase: "Launch a public mainnet beta with validator onboarding open to unaffiliated operators.",
        importance: "core",
        sourcePath: "/roadmap#q1",
        claimDaysAgo: 320,
        deadlineInDays: -200,
        status: "shipped",
        deliveredInDays: -215,
        evidence: [
          { type: "product_release", title: "Mainnet beta live with public explorer", summary: "Public explorer shows validator set with 84 unaffiliated operators; release notes list beta scope and known limitations.", path: "/blog/mainnet-beta", publishedDaysAgo: 215 },
          { type: "repository_release", title: "aurelia-node v1.0.0 release", summary: "Tagged release with signed binaries and changelog matching the beta announcement.", path: "/repo/releases/v1.0.0", publishedDaysAgo: 216 },
        ],
      },
      {
        key: "light-client-sdk",
        title: "Light-client SDK v1",
        paraphrase: "Publish a stable light-client SDK for browsers and mobile with documentation.",
        importance: "major",
        sourcePath: "/roadmap#q2",
        claimDaysAgo: 260,
        deadlineInDays: -120,
        status: "shipped",
        deliveredInDays: -110,
        moderatorNote: "Shipped ten days after the published deadline; the project announced the slip in advance.",
        evidence: [
          { type: "repository_release", title: "light-client-sdk v1.0.0", summary: "Tagged v1.0.0 with API docs; npm package published the same day.", path: "/repo/light-client/releases/v1.0.0", publishedDaysAgo: 110, submitter: "tomasz-rivera", submitterKind: "community" },
          { type: "official_announcement", title: "SDK release announcement", summary: "Announcement describing supported platforms and the ten-day delay explanation.", path: "/blog/light-client-sdk", publishedDaysAgo: 110 },
        ],
      },
      {
        key: "staking-dashboard",
        title: "Validator staking dashboard",
        paraphrase: "Release a staking dashboard for delegators with real-time validator metrics.",
        importance: "major",
        sourcePath: "/roadmap#q3",
        claimDaysAgo: 180,
        deadlineInDays: -60,
        status: "shipped",
        deliveredInDays: -65,
        evidence: [
          { type: "product_release", title: "Staking dashboard publicly available", summary: "Dashboard reachable at the documented URL; shows validator metrics and delegation flows described in the roadmap.", path: "/stake", publishedDaysAgo: 65 },
        ],
      },
      {
        key: "explorer-api-v2",
        title: "Explorer API v2",
        paraphrase: "Ship version 2 of the explorer API including websocket subscriptions and historical queries.",
        importance: "minor",
        sourcePath: "/roadmap#q3",
        claimDaysAgo: 150,
        deadlineInDays: -30,
        status: "partially_shipped",
        deliveredInDays: -28,
        moderatorNote: "Historical queries are documented and live; websocket subscriptions remain marked experimental in the docs.",
        evidence: [
          { type: "official_announcement", title: "Explorer API v2 documentation", summary: "Docs describe historical query endpoints as generally available and websockets as experimental.", path: "/docs/explorer-api-v2", publishedDaysAgo: 28 },
        ],
      },
      {
        key: "parallel-exec-testnet",
        title: "Public testnet for parallel execution",
        paraphrase: "Open a public testnet running the parallel execution engine.",
        importance: "core",
        sourcePath: "/roadmap#q4",
        claimDaysAgo: 90,
        deadlineInDays: 18,
        status: "in_progress",
        evidence: [
          { type: "official_announcement", title: "Parallel execution progress update", summary: "Dated engineering update listing remaining blockers before public testnet.", path: "/blog/parallel-exec-update-3", publishedDaysAgo: 9 },
        ],
      },
      {
        key: "gov-audit",
        title: "Governance module audit publication",
        paraphrase: "Publish the third-party audit report of the governance module.",
        importance: "minor",
        sourcePath: "/roadmap#q4",
        claimDaysAgo: 60,
        deadlineInDays: 45,
        status: "planned",
      },
    ],
  },
  {
    slug: "tessera-rollup",
    name: "Tessera Rollup",
    category: "L2",
    ecosystem: "Aurelia",
    description: "Fictional optimistic rollup that publishes a public engineering roadmap and monthly progress notes.",
    domain: "tessera.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Docs", path: "/docs", kind: "docs" },
      { label: "Repository", path: "/repo", kind: "repository" },
    ],
    transparency: { datedRoadmapUpdates: 6, explanationRate: 0.8, hasPublicDocs: true, changeDisclosureRate: 0.8 },
    github: { owner: "tessera-example", repo: "tessera-rollup", activeWeeks: 9, releases90d: 2, tags90d: 2, lastPushDaysAgo: 5, stars: 960, latestTag: "v0.9.2" },
    endpoints: [
      { label: "Bridge app", path: "/bridge", uptime: 0.97 },
      { label: "RPC status", path: "/status", uptime: 0.98 },
    ],
    lastVerifiedDaysAgo: 2,
    milestones: [
      {
        key: "sequencer-phase1",
        title: "Sequencer decentralization phase 1",
        paraphrase: "Move sequencing to a permissioned set of at least five independent operators.",
        importance: "core",
        sourcePath: "/roadmap#sequencer",
        claimDaysAgo: 330,
        deadlineInDays: 40,
        originalDeadlineInDays: -150,
        status: "delayed",
        hasUpdatedExplanation: true,
        moderatorNote: "Deadline moved with a published explanation citing operator onboarding; tracked against the new date.",
        evidence: [
          { type: "official_announcement", title: "Sequencer timeline update", summary: "Dated post explaining the slip and committing to a new date.", path: "/blog/sequencer-update", publishedDaysAgo: 140 },
        ],
      },
      {
        key: "fraud-proofs-testnet",
        title: "Fraud-proof system on public testnet",
        paraphrase: "Deploy the interactive fraud-proof system to the public testnet with documentation for challengers.",
        importance: "core",
        sourcePath: "/roadmap#fraud-proofs",
        claimDaysAgo: 280,
        deadlineInDays: -90,
        status: "shipped",
        deliveredInDays: -80,
        evidence: [
          { type: "repository_release", title: "tessera-rollup v0.9.0 (fraud proofs)", summary: "Release includes challenger CLI and testnet deployment addresses.", path: "/repo/releases/v0.9.0", publishedDaysAgo: 80, submitter: "tomasz-rivera", submitterKind: "community" },
          { type: "independent_reporting", title: "Independent write-up of testnet fraud proofs", summary: "Third-party engineering blog reproduces a challenge on the public testnet.", path: "/reporting/tessera-fraud-proofs", publishedDaysAgo: 75 },
        ],
      },
      {
        key: "explorer-launch",
        title: "Public block explorer",
        paraphrase: "Launch a public block explorer for the rollup with transaction search.",
        importance: "minor",
        sourcePath: "/roadmap#explorer",
        claimDaysAgo: 200,
        deadlineInDays: -110,
        status: "shipped",
        deliveredInDays: -112,
        evidence: [
          { type: "product_release", title: "Explorer live", summary: "Explorer reachable at the documented URL with transaction search.", path: "/explorer", publishedDaysAgo: 112 },
        ],
      },
      {
        key: "bridge-ui",
        title: "Bridge UI redesign",
        paraphrase: "Release a redesigned bridge interface with transaction status tracking.",
        importance: "minor",
        sourcePath: "/roadmap#bridge",
        claimDaysAgo: 120,
        deadlineInDays: -45,
        status: "shipped",
        deliveredInDays: -50,
        evidence: [
          { type: "product_release", title: "New bridge interface live", summary: "Redesigned bridge reachable at the documented URL with status tracking.", path: "/bridge", publishedDaysAgo: 50 },
        ],
      },
      {
        key: "fee-upgrade",
        title: "Fee reduction upgrade",
        paraphrase: "Deploy the batch compression upgrade targeting a 40% reduction in average transaction fees.",
        importance: "major",
        sourcePath: "/roadmap#fees",
        claimDaysAgo: 100,
        deadlineInDays: -20,
        status: "submitted_for_review",
        moderatorNote: "Community evidence submitted; awaiting moderator review of the fee data source.",
        evidence: [
          { type: "official_announcement", title: "Fee upgrade activation notice", summary: "Announcement states the upgrade activated at block 4,210,000 and links a dashboard.", path: "/blog/fee-upgrade", publishedDaysAgo: 18, reviewState: "pending", submitter: "tomasz-rivera", submitterKind: "community", support: 4, challenge: 1 },
          { type: "community_observation", title: "Screenshot of lower fees", summary: "A screenshot without a source URL showing lower fees in a wallet.", path: "/community/fee-screenshot", publishedDaysAgo: 17, reviewState: "needs_clarification", reviewReason: "Screenshots without a source URL are weak evidence. Please link the dashboard or block data.", submitter: "aiko-tanaka", submitterKind: "community" },
        ],
      },
      {
        key: "da-integration",
        title: "Data availability layer integration",
        paraphrase: "Post batch data to the external data availability layer on mainnet.",
        importance: "major",
        sourcePath: "/roadmap#da",
        claimDaysAgo: 80,
        deadlineInDays: 5,
        status: "in_progress",
        evidence: [
          { type: "official_announcement", title: "DA integration status", summary: "Dated progress note: integration live on testnet, mainnet activation scheduled.", path: "/blog/da-status", publishedDaysAgo: 6 },
        ],
      },
    ],
  },
  {
    slug: "quillswap",
    name: "Quillswap",
    category: "DeFi",
    ecosystem: "Multi-chain",
    description: "Fictional automated market maker with a public changelog and quarterly commitments.",
    domain: "quillswap.example",
    links: [
      { label: "App", path: "/app", kind: "app" },
      { label: "Docs", path: "/docs", kind: "docs" },
      { label: "Repository", path: "/repo", kind: "repository" },
    ],
    transparency: { datedRoadmapUpdates: 4, explanationRate: 0.5, hasPublicDocs: true, changeDisclosureRate: 0.7 },
    github: { owner: "quillswap-example", repo: "quillswap-core", activeWeeks: 10, releases90d: 4, tags90d: 0, lastPushDaysAgo: 3, stars: 2210, latestTag: "v2.4.0" },
    endpoints: [{ label: "App", path: "/app", uptime: 0.995 }],
    lastVerifiedDaysAgo: 3,
    milestones: [
      {
        key: "amm-v2",
        title: "AMM v2 launch",
        paraphrase: "Launch version 2 of the AMM with concentrated liquidity on mainnet.",
        importance: "core",
        sourcePath: "/changelog#v2",
        claimDaysAgo: 400,
        deadlineInDays: -240,
        status: "shipped",
        deliveredInDays: -250,
        evidence: [
          { type: "product_release", title: "Quillswap v2 live", summary: "App exposes v2 pools; docs list deployed contract addresses.", path: "/app", publishedDaysAgo: 250 },
          { type: "repository_release", title: "quillswap-core v2.0.0", summary: "Tagged release with audited contracts.", path: "/repo/releases/v2.0.0", publishedDaysAgo: 251 },
        ],
      },
      {
        key: "limit-orders",
        title: "Limit orders",
        paraphrase: "Add on-chain limit orders to the interface.",
        importance: "major",
        sourcePath: "/changelog#limit-orders",
        claimDaysAgo: 300,
        deadlineInDays: -160,
        status: "shipped",
        deliveredInDays: -140,
        evidence: [
          { type: "product_release", title: "Limit orders available in app", summary: "Feature visible in the app with documentation page.", path: "/docs/limit-orders", publishedDaysAgo: 140, submitter: "aiko-tanaka", submitterKind: "community" },
        ],
      },
      {
        key: "mobile-ui",
        title: "Mobile-friendly interface",
        paraphrase: "Release a responsive mobile layout for the app.",
        importance: "minor",
        sourcePath: "/changelog#mobile",
        claimDaysAgo: 200,
        deadlineInDays: -100,
        status: "shipped",
        deliveredInDays: -100,
        evidence: [{ type: "official_announcement", title: "Mobile layout release notes", summary: "Release notes describing the responsive layout.", path: "/changelog#mobile-release", publishedDaysAgo: 100 }],
      },
      {
        key: "cross-chain-routing",
        title: "Cross-chain routing",
        paraphrase: "Enable swaps routed across supported chains from a single interface.",
        importance: "major",
        sourcePath: "/changelog#cross-chain",
        claimDaysAgo: 150,
        deadlineInDays: -30,
        status: "no_evidence",
        moderatorNote: "No qualifying evidence found as of the last check; the project has not published an update on this item.",
        evidence: [
          { type: "community_observation", title: "Forum post claiming routing works", summary: "Forum post without a link to the product or documentation.", path: "/community/routing-post", publishedDaysAgo: 25, reviewState: "rejected", reviewReason: "Community observation without a verifiable source; does not meet the evidence bar for a major milestone.", submitter: "tomasz-rivera", submitterKind: "community" },
        ],
      },
      {
        key: "fee-switch-vote",
        title: "Fee switch governance vote",
        paraphrase: "Hold a governance vote on activating the protocol fee switch.",
        importance: "minor",
        sourcePath: "/changelog#fee-switch",
        claimDaysAgo: 40,
        deadlineInDays: 12,
        status: "planned",
      },
    ],
  },
  {
    slug: "nimbus-wallet",
    name: "Nimbus Wallet",
    category: "Wallet",
    ecosystem: "Multi-chain",
    description: "Fictional self-custody wallet with browser, mobile and desktop clients and a public release cadence.",
    domain: "nimbuswallet.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Docs", path: "/docs", kind: "docs" },
      { label: "Repository", path: "/repo", kind: "repository" },
    ],
    transparency: { datedRoadmapUpdates: 3, explanationRate: 0.6, hasPublicDocs: true, changeDisclosureRate: 0.6 },
    github: { owner: "nimbus-example", repo: "nimbus-wallet", activeWeeks: 8, releases90d: 2, tags90d: 0, lastPushDaysAgo: 8, stars: 730, latestTag: "v3.2.1" },
    endpoints: [
      { label: "Website", path: "/", uptime: 0.99 },
      { label: "Web app", path: "/app", uptime: 0.96 },
    ],
    lastVerifiedDaysAgo: 2,
    milestones: [
      {
        key: "hardware-support",
        title: "Hardware wallet support",
        paraphrase: "Support two major hardware wallet vendors in the browser extension.",
        importance: "major",
        sourcePath: "/roadmap#hardware",
        claimDaysAgo: 320,
        deadlineInDays: -180,
        status: "shipped",
        deliveredInDays: -170,
        evidence: [{ type: "repository_release", title: "nimbus-wallet v3.0.0", summary: "Release notes list hardware wallet support for two vendors.", path: "/repo/releases/v3.0.0", publishedDaysAgo: 170 }],
      },
      {
        key: "multi-account-recovery",
        title: "Multi-account recovery",
        paraphrase: "Ship social/multi-account recovery for mobile users.",
        importance: "core",
        sourcePath: "/roadmap#recovery",
        claimDaysAgo: 260,
        deadlineInDays: -120,
        status: "shipped",
        deliveredInDays: -130,
        evidence: [
          { type: "product_release", title: "Recovery flow in mobile app", summary: "Feature documented and available in the current mobile release.", path: "/docs/recovery", publishedDaysAgo: 130, submitter: "aiko-tanaka", submitterKind: "community" },
        ],
      },
      {
        key: "tx-simulation",
        title: "In-app transaction simulation",
        paraphrase: "Simulate transactions before signing and display balance changes for all users.",
        importance: "major",
        sourcePath: "/roadmap#simulation",
        claimDaysAgo: 180,
        deadlineInDays: -60,
        status: "disputed",
        moderatorNote: "Community challenge: feature appears limited to a beta cohort. Excluded from score until resolved.",
        evidence: [
          { type: "official_announcement", title: "Transaction simulation announcement", summary: "Announcement describes simulation as rolling out to users.", path: "/blog/simulation", publishedDaysAgo: 58, support: 3, challenge: 5 },
        ],
      },
      {
        key: "extension-v2",
        title: "Browser extension v2",
        paraphrase: "Release the rewritten browser extension with a new permission model.",
        importance: "major",
        sourcePath: "/roadmap#extension",
        claimDaysAgo: 120,
        deadlineInDays: -10,
        status: "shipped",
        deliveredInDays: -12,
        evidence: [{ type: "repository_release", title: "nimbus-wallet v3.2.0", summary: "Tagged release with the new permission model changelog.", path: "/repo/releases/v3.2.0", publishedDaysAgo: 12 }],
      },
      {
        key: "desktop-app",
        title: "Desktop app",
        paraphrase: "Ship a desktop client for macOS, Windows and Linux.",
        importance: "minor",
        sourcePath: "/roadmap#desktop",
        claimDaysAgo: 70,
        deadlineInDays: 30,
        status: "in_progress",
        evidence: [{ type: "official_announcement", title: "Desktop beta sign-ups", summary: "Dated note opening a desktop beta.", path: "/blog/desktop-beta", publishedDaysAgo: 12 }],
      },
    ],
  },
  {
    slug: "hollowmere-realms",
    name: "Hollowmere Realms",
    category: "Gaming",
    ecosystem: "Solenne",
    description: "Fictional on-chain strategy game with an ambitious public roadmap and a small team.",
    domain: "hollowmere.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Roadmap", path: "/roadmap", kind: "other" },
      { label: "Repository", path: "/repo", kind: "repository" },
    ],
    transparency: { datedRoadmapUpdates: 1, explanationRate: 0.5, hasPublicDocs: false, changeDisclosureRate: 0.3 },
    github: { owner: "hollowmere-example", repo: "hollowmere-client", activeWeeks: 3, releases90d: 0, tags90d: 0, lastPushDaysAgo: 70, stars: 210, latestTag: "v0.3.1" },
    endpoints: [
      { label: "Website", path: "/", uptime: 0.9 },
      { label: "Game client", path: "/play", uptime: 0.82 },
    ],
    lastVerifiedDaysAgo: 4,
    milestones: [
      {
        key: "closed-alpha",
        title: "Closed alpha",
        paraphrase: "Open a closed alpha to holders of the founder pass.",
        importance: "core",
        sourcePath: "/roadmap#alpha",
        claimDaysAgo: 420,
        deadlineInDays: -300,
        status: "shipped",
        deliveredInDays: -260,
        evidence: [{ type: "official_announcement", title: "Closed alpha begins", summary: "Announcement with dated alpha instructions and known issues.", path: "/blog/closed-alpha", publishedDaysAgo: 260 }],
      },
      {
        key: "founder-pass-site",
        title: "Founder pass claim site",
        paraphrase: "Launch the site where founder pass holders claim in-game access.",
        importance: "minor",
        sourcePath: "/roadmap#founder",
        claimDaysAgo: 400,
        deadlineInDays: -240,
        status: "shipped",
        deliveredInDays: -235,
        evidence: [{ type: "official_announcement", title: "Claim site announcement", summary: "Dated announcement linking the claim site.", path: "/blog/claim-site", publishedDaysAgo: 235 }],
      },
      {
        key: "tokenomics-docs",
        title: "Economy documentation",
        paraphrase: "Publish documentation describing the in-game economy and item sinks.",
        importance: "minor",
        sourcePath: "/roadmap#economy",
        claimDaysAgo: 330,
        deadlineInDays: -120,
        status: "no_evidence",
        moderatorNote: "No qualifying evidence found as of the last check.",
      },
      {
        key: "open-beta",
        title: "Open beta",
        paraphrase: "Open the beta to all players without a founder pass.",
        importance: "core",
        sourcePath: "/roadmap#beta",
        claimDaysAgo: 360,
        deadlineInDays: 25,
        originalDeadlineInDays: -150,
        status: "delayed",
        hasUpdatedExplanation: true,
        moderatorNote: "Project published a new target date with an explanation citing server capacity.",
        evidence: [{ type: "official_announcement", title: "Open beta postponed", summary: "Dated post explaining the delay and giving a new window.", path: "/blog/beta-update", publishedDaysAgo: 145 }],
      },
      {
        key: "marketplace",
        title: "Marketplace launch",
        paraphrase: "Launch an in-game marketplace for tradable items.",
        importance: "major",
        sourcePath: "/roadmap#marketplace",
        claimDaysAgo: 300,
        deadlineInDays: -90,
        status: "no_evidence",
        moderatorNote: "No qualifying evidence found as of the last check. A correction request from the project is open.",
      },
      {
        key: "season-1",
        title: "Season 1 content drop",
        paraphrase: "Release the first seasonal content pack.",
        importance: "minor",
        sourcePath: "/roadmap#season1",
        claimDaysAgo: 200,
        deadlineInDays: -40,
        status: "cancelled",
        hasUpdatedExplanation: true,
        moderatorNote: "Project publicly withdrew this item with an explanation; shown separately and excluded from delivery.",
        evidence: [{ type: "official_announcement", title: "Season 1 folded into open beta", summary: "Dated post explaining the content pack is cancelled as a separate item.", path: "/blog/season-1-update", publishedDaysAgo: 45 }],
      },
      {
        key: "mobile-client",
        title: "Mobile client",
        paraphrase: "Ship a mobile client for the game.",
        importance: "major",
        sourcePath: "/roadmap#mobile",
        claimDaysAgo: 100,
        deadlineInDays: 60,
        status: "planned",
      },
    ],
  },
  {
    slug: "veritas-id",
    name: "Veritas ID",
    category: "Identity",
    ecosystem: "Meridian",
    description: "Fictional decentralized identity project that recently began publishing dated commitments.",
    domain: "veritasid.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Spec", path: "/spec", kind: "docs" },
      { label: "Repository", path: "/repo", kind: "repository" },
    ],
    transparency: { datedRoadmapUpdates: 2, explanationRate: 1, hasPublicDocs: true, changeDisclosureRate: 1 },
    github: { owner: "veritas-example", repo: "veritas-sdk", activeWeeks: 12, releases90d: 1, tags90d: 1, lastPushDaysAgo: 1, stars: 310, latestTag: "v0.2.0-alpha" },
    endpoints: [{ label: "Website", path: "/", uptime: 0.99 }],
    lastVerifiedDaysAgo: 1,
    milestones: [
      {
        key: "credential-spec",
        title: "Credential schema specification",
        paraphrase: "Publish version 1 of the credential schema specification.",
        importance: "major",
        sourcePath: "/roadmap#spec",
        claimDaysAgo: 90,
        deadlineInDays: -40,
        status: "shipped",
        deliveredInDays: -42,
        evidence: [{ type: "official_announcement", title: "Specification v1 published", summary: "Spec page carries a version and publication date.", path: "/spec/v1", publishedDaysAgo: 42 }],
      },
      {
        key: "verifier-sdk-alpha",
        title: "Verifier SDK alpha",
        paraphrase: "Release an alpha of the verifier SDK.",
        importance: "major",
        sourcePath: "/roadmap#sdk",
        claimDaysAgo: 80,
        deadlineInDays: -15,
        status: "shipped",
        deliveredInDays: -10,
        evidence: [{ type: "repository_release", title: "veritas-sdk v0.2.0-alpha", summary: "Tagged alpha release with README and examples.", path: "/repo/releases/v0.2.0-alpha", publishedDaysAgo: 10 }],
      },
      {
        key: "wallet-pilot",
        title: "Wallet integration pilot",
        paraphrase: "Run a pilot with one wallet partner issuing credentials.",
        importance: "core",
        sourcePath: "/roadmap#pilot",
        claimDaysAgo: 60,
        deadlineInDays: 20,
        status: "in_progress",
      },
      {
        key: "issuer-registry",
        title: "Mainnet issuer registry",
        paraphrase: "Deploy the issuer registry contract to mainnet.",
        importance: "core",
        sourcePath: "/roadmap#registry",
        claimDaysAgo: 60,
        deadlineInDays: 90,
        status: "planned",
      },
    ],
  },
  {
    slug: "lumen-data-grid",
    name: "Lumen Data Grid",
    category: "Data",
    ecosystem: "Multi-chain",
    description: "Fictional indexing and query network with a public status page and release notes.",
    domain: "lumengrid.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Docs", path: "/docs", kind: "docs" },
      { label: "Repository", path: "/repo", kind: "repository" },
      { label: "Status", path: "/status", kind: "other" },
    ],
    transparency: { datedRoadmapUpdates: 4, explanationRate: 0.75, hasPublicDocs: true, changeDisclosureRate: 0.9 },
    github: { owner: "lumen-example", repo: "lumen-indexer", activeWeeks: 10, releases90d: 2, tags90d: 1, lastPushDaysAgo: 4, stars: 540, latestTag: "v1.8.0" },
    endpoints: [
      { label: "API", path: "/api/health", uptime: 0.985 },
      { label: "Docs", path: "/docs", uptime: 0.99 },
    ],
    lastVerifiedDaysAgo: 1,
    milestones: [
      { key: "indexer-v1", title: "Indexer v1", paraphrase: "Release the first production indexer.", importance: "core", sourcePath: "/roadmap#v1", claimDaysAgo: 360, deadlineInDays: -200, status: "shipped", deliveredInDays: -205, evidence: [{ type: "repository_release", title: "lumen-indexer v1.0.0", summary: "Tagged release and docs.", path: "/repo/releases/v1.0.0", publishedDaysAgo: 205 }] },
      { key: "graphql-api", title: "GraphQL API", paraphrase: "Expose indexed data through a public GraphQL API.", importance: "major", sourcePath: "/roadmap#graphql", claimDaysAgo: 280, deadlineInDays: -140, status: "shipped", deliveredInDays: -120, evidence: [{ type: "product_release", title: "GraphQL endpoint live", summary: "Endpoint documented and reachable; playground available.", path: "/docs/graphql", publishedDaysAgo: 120, submitter: "tomasz-rivera", submitterKind: "community" }] },
      { key: "archive-tier", title: "Historical archive tier", paraphrase: "Offer a full-history archive tier for all supported chains.", importance: "major", sourcePath: "/roadmap#archive", claimDaysAgo: 200, deadlineInDays: -70, status: "partially_shipped", deliveredInDays: -68, moderatorNote: "Archive tier live for two of four documented chains.", evidence: [{ type: "official_announcement", title: "Archive tier availability", summary: "Docs list archive coverage per chain with dates.", path: "/docs/archive", publishedDaysAgo: 68 }] },
      { key: "billing-dashboard", title: "Query billing dashboard", paraphrase: "Ship a usage and billing dashboard for API consumers.", importance: "minor", sourcePath: "/roadmap#billing", claimDaysAgo: 120, deadlineInDays: -25, status: "shipped", deliveredInDays: -25, evidence: [{ type: "product_release", title: "Billing dashboard", summary: "Dashboard reachable from the console; docs page dated.", path: "/docs/billing", publishedDaysAgo: 25 }] },
      { key: "realtime-subs", title: "Real-time subscriptions", paraphrase: "Add websocket subscriptions for indexed entities.", importance: "major", sourcePath: "/roadmap#realtime", claimDaysAgo: 110, deadlineInDays: 3, originalDeadlineInDays: -20, status: "in_progress", hasUpdatedExplanation: true, evidence: [{ type: "official_announcement", title: "Subscriptions timeline update", summary: "Dated post moving the target by about three weeks with reasons.", path: "/blog/realtime-update", publishedDaysAgo: 24 }] },
      { key: "multi-region", title: "Multi-region replication", paraphrase: "Replicate the index across three regions.", importance: "core", sourcePath: "/roadmap#regions", claimDaysAgo: 50, deadlineInDays: 75, status: "planned" },
    ],
  },
  {
    slug: "cinderpay",
    name: "Cinderpay",
    category: "DeFi",
    ecosystem: "Meridian",
    description: "Fictional stablecoin payments product with closed-source clients and a public changelog.",
    domain: "cinderpay.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Changelog", path: "/changelog", kind: "docs" },
    ],
    transparency: { datedRoadmapUpdates: 4, explanationRate: 0.5, hasPublicDocs: true, changeDisclosureRate: 0.6 },
    endpoints: [
      { label: "Checkout", path: "/checkout/health", uptime: 0.985 },
      { label: "Merchant dashboard", path: "/dashboard", uptime: 0.98 },
    ],
    lastVerifiedDaysAgo: 2,
    milestones: [
      { key: "checkout-sdk", title: "Merchant checkout SDK", paraphrase: "Release a hosted checkout SDK for merchants.", importance: "core", sourcePath: "/changelog#checkout", claimDaysAgo: 300, deadlineInDays: -170, status: "shipped", deliveredInDays: -175, evidence: [{ type: "product_release", title: "Checkout SDK docs and live demo", summary: "Documented SDK with a public demo checkout.", path: "/docs/checkout", publishedDaysAgo: 175 }] },
      { key: "recurring", title: "Recurring payments", paraphrase: "Support recurring payment schedules.", importance: "major", sourcePath: "/changelog#recurring", claimDaysAgo: 220, deadlineInDays: -100, status: "shipped", deliveredInDays: -95, evidence: [{ type: "official_announcement", title: "Recurring payments release notes", summary: "Changelog entry with a date and feature description.", path: "/changelog#recurring-release", publishedDaysAgo: 95 }] },
      { key: "offramp", title: "Fiat off-ramp partner integration", paraphrase: "Integrate a licensed fiat off-ramp partner for merchants.", importance: "major", sourcePath: "/changelog#offramp", claimDaysAgo: 160, deadlineInDays: -50, status: "shipped", deliveredInDays: -55, evidence: [{ type: "product_release", title: "Off-ramp available in dashboard", summary: "Feature documented and visible in the merchant dashboard.", path: "/docs/offramp", publishedDaysAgo: 55 }] },
      { key: "invoicing", title: "Invoicing tool", paraphrase: "Ship an invoicing tool for merchants.", importance: "minor", sourcePath: "/changelog#invoicing", claimDaysAgo: 90, deadlineInDays: -10, status: "no_evidence", moderatorNote: "No qualifying evidence found as of the last check." },
      { key: "multi-currency", title: "Multi-currency settlement", paraphrase: "Settle in three additional stablecoins.", importance: "major", sourcePath: "/changelog#multi-currency", claimDaysAgo: 60, deadlineInDays: 40, status: "in_progress" },
    ],
  },
  {
    slug: "fathom-privacy",
    name: "Fathom Privacy",
    category: "Privacy",
    ecosystem: "Aurelia",
    description: "Fictional privacy protocol developing shielded transfers with a public research roadmap.",
    domain: "fathom.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Docs", path: "/docs", kind: "docs" },
      { label: "Repository", path: "/repo", kind: "repository" },
    ],
    transparency: { datedRoadmapUpdates: 3, explanationRate: 0.5, hasPublicDocs: true, changeDisclosureRate: 0.5 },
    github: { owner: "fathom-example", repo: "fathom-protocol", activeWeeks: 7, releases90d: 1, tags90d: 0, lastPushDaysAgo: 12, stars: 480, latestTag: "v0.5.0" },
    endpoints: [{ label: "Website", path: "/", uptime: 0.97 }],
    lastVerifiedDaysAgo: 3,
    milestones: [
      { key: "shielded-testnet", title: "Shielded transfers on testnet", paraphrase: "Deploy shielded transfers to the public testnet.", importance: "core", sourcePath: "/roadmap#testnet", claimDaysAgo: 260, deadlineInDays: -130, status: "shipped", deliveredInDays: -120, evidence: [{ type: "repository_release", title: "fathom-protocol v0.4.0", summary: "Release with testnet deployment details.", path: "/repo/releases/v0.4.0", publishedDaysAgo: 120 }] },
      { key: "audit-report", title: "Audit report publication", paraphrase: "Publish the external audit report for the circuits.", importance: "major", sourcePath: "/roadmap#audit", claimDaysAgo: 180, deadlineInDays: -80, status: "shipped", deliveredInDays: -80, evidence: [{ type: "official_announcement", title: "Audit report published", summary: "Report linked from the docs with a date.", path: "/docs/audit", publishedDaysAgo: 80 }] },
      { key: "mainnet-pool", title: "Mainnet shielded pool", paraphrase: "Launch the shielded pool on mainnet.", importance: "core", sourcePath: "/roadmap#mainnet", claimDaysAgo: 150, deadlineInDays: 50, originalDeadlineInDays: -30, status: "delayed", hasUpdatedExplanation: true, evidence: [{ type: "official_announcement", title: "Mainnet timeline revised", summary: "Dated post explaining additional audit rounds and a new date.", path: "/blog/mainnet-update", publishedDaysAgo: 32 }] },
      { key: "browser-extension", title: "Browser extension", paraphrase: "Ship a browser extension for shielded transfers.", importance: "minor", sourcePath: "/roadmap#extension", claimDaysAgo: 140, deadlineInDays: -60, status: "no_evidence", moderatorNote: "No qualifying evidence found as of the last check." },
      { key: "viewing-keys", title: "Viewing keys specification", paraphrase: "Publish the viewing keys specification.", importance: "minor", sourcePath: "/roadmap#viewing-keys", claimDaysAgo: 50, deadlineInDays: 14, status: "planned" },
    ],
  },
  {
    slug: "orbitalk",
    name: "Orbitalk",
    category: "Social",
    ecosystem: "Solenne",
    description: "Fictional decentralized social protocol with a public roadmap that has changed several times.",
    domain: "orbitalk.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Repository", path: "/repo", kind: "repository" },
    ],
    transparency: { datedRoadmapUpdates: 2, explanationRate: 0.25, hasPublicDocs: true, changeDisclosureRate: 0.4 },
    github: { owner: "orbitalk-example", repo: "orbitalk-protocol", activeWeeks: 5, releases90d: 1, tags90d: 0, lastPushDaysAgo: 40, stars: 390, latestTag: "v1.1.0" },
    endpoints: [
      { label: "Web client", path: "/app", uptime: 0.93 },
    ],
    lastVerifiedDaysAgo: 5,
    milestones: [
      { key: "protocol-v1", title: "Protocol v1", paraphrase: "Publish and deploy protocol version 1.", importance: "core", sourcePath: "/roadmap#v1", claimDaysAgo: 380, deadlineInDays: -220, status: "shipped", deliveredInDays: -230, evidence: [{ type: "repository_release", title: "orbitalk-protocol v1.0.0", summary: "Tagged release and deployment notes.", path: "/repo/releases/v1.0.0", publishedDaysAgo: 230 }] },
      { key: "federation", title: "Federation with third-party clients", paraphrase: "Enable third-party clients to federate with the network.", importance: "major", sourcePath: "/roadmap#federation", claimDaysAgo: 300, deadlineInDays: -120, status: "cancelled", hasUpdatedExplanation: false, moderatorNote: "Item removed from the roadmap without a published explanation; counted as not delivered per methodology." },
      { key: "creator-tools", title: "Creator monetization tools", paraphrase: "Ship tipping and subscription tools for creators.", importance: "major", sourcePath: "/roadmap#creators", claimDaysAgo: 200, deadlineInDays: -60, status: "delayed", hasUpdatedExplanation: false, moderatorNote: "Deadline passed; the project has acknowledged the delay in a community call but not published an updated timeline." },
      { key: "mobile-app", title: "Mobile app", paraphrase: "Release a mobile client.", importance: "major", sourcePath: "/roadmap#mobile", claimDaysAgo: 150, deadlineInDays: -15, status: "shipped", deliveredInDays: -16, evidence: [{ type: "product_release", title: "Mobile app listing", summary: "App store listing and docs page dated the same week.", path: "/docs/mobile", publishedDaysAgo: 16 }] },
      { key: "moderation-tools", title: "Moderation tooling", paraphrase: "Ship community moderation tooling for client operators.", importance: "minor", sourcePath: "/roadmap#moderation", claimDaysAgo: 60, deadlineInDays: 28, status: "planned" },
    ],
  },
  {
    slug: "keelstone-oracle",
    name: "Keelstone Oracle",
    category: "Infrastructure",
    ecosystem: "Multi-chain",
    description: "Fictional oracle network with a long public delivery record and detailed release notes.",
    domain: "keelstone.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Docs", path: "/docs", kind: "docs" },
      { label: "Repository", path: "/repo", kind: "repository" },
    ],
    transparency: { datedRoadmapUpdates: 6, explanationRate: 1, hasPublicDocs: true, changeDisclosureRate: 1 },
    github: { owner: "keelstone-example", repo: "keelstone-node", activeWeeks: 12, releases90d: 5, tags90d: 2, lastPushDaysAgo: 1, stars: 3100, latestTag: "v4.2.0" },
    endpoints: [
      { label: "Feeds status", path: "/status", uptime: 0.999 },
      { label: "Docs", path: "/docs", uptime: 0.995 },
    ],
    lastVerifiedDaysAgo: 1,
    milestones: [
      { key: "price-feeds", title: "Price feeds on mainnet", paraphrase: "Launch price feeds on mainnet with published update thresholds.", importance: "core", sourcePath: "/roadmap#feeds", claimDaysAgo: 400, deadlineInDays: -260, status: "shipped", deliveredInDays: -270, evidence: [{ type: "product_release", title: "Feeds live with public status page", summary: "Status page lists live feeds and update thresholds.", path: "/status", publishedDaysAgo: 270 }] },
      { key: "vrf", title: "Verifiable randomness", paraphrase: "Release a verifiable randomness service.", importance: "major", sourcePath: "/roadmap#vrf", claimDaysAgo: 320, deadlineInDays: -180, status: "shipped", deliveredInDays: -185, evidence: [{ type: "repository_release", title: "keelstone-node v3.0.0", summary: "Release notes include the randomness service and docs.", path: "/repo/releases/v3.0.0", publishedDaysAgo: 185 }] },
      { key: "cross-chain-messaging", title: "Cross-chain messaging", paraphrase: "Ship cross-chain messaging between three supported networks.", importance: "core", sourcePath: "/roadmap#messaging", claimDaysAgo: 240, deadlineInDays: -90, status: "shipped", deliveredInDays: -88, moderatorNote: "Shipped two days after the deadline; counted as late per methodology.", evidence: [{ type: "product_release", title: "Messaging docs and live routes", summary: "Docs list live routes with activation dates.", path: "/docs/messaging", publishedDaysAgo: 88, submitter: "tomasz-rivera", submitterKind: "community" }] },
      { key: "operator-dashboard", title: "Node operator dashboard", paraphrase: "Ship a dashboard for node operators.", importance: "minor", sourcePath: "/roadmap#dashboard", claimDaysAgo: 120, deadlineInDays: -30, status: "shipped", deliveredInDays: -33, evidence: [{ type: "official_announcement", title: "Operator dashboard release", summary: "Release notes with date and screenshots linked to docs.", path: "/blog/operator-dashboard", publishedDaysAgo: 33 }] },
      { key: "low-latency", title: "Low-latency feeds", paraphrase: "Release sub-second feeds for selected markets.", importance: "major", sourcePath: "/roadmap#low-latency", claimDaysAgo: 90, deadlineInDays: 6, status: "in_progress", evidence: [{ type: "official_announcement", title: "Low-latency feeds progress", summary: "Dated update: feeds live on testnet, mainnet pending.", path: "/blog/low-latency-update", publishedDaysAgo: 4 }] },
      { key: "proof-of-reserve", title: "Proof-of-reserve feeds", paraphrase: "Publish proof-of-reserve feeds for two custodians.", importance: "major", sourcePath: "/roadmap#por", claimDaysAgo: 40, deadlineInDays: 55, status: "planned" },
    ],
  },
  {
    slug: "bridgeforge",
    name: "Bridgeforge",
    category: "Infrastructure",
    ecosystem: "Multi-chain",
    description: "Fictional cross-chain bridge with a public security roadmap and a previously disputed milestone.",
    domain: "bridgeforge.example",
    links: [
      { label: "Website", path: "/", kind: "website" },
      { label: "Docs", path: "/docs", kind: "docs" },
      { label: "Repository", path: "/repo", kind: "repository" },
    ],
    transparency: { datedRoadmapUpdates: 3, explanationRate: 0.75, hasPublicDocs: true, changeDisclosureRate: 0.7 },
    github: { owner: "bridgeforge-example", repo: "bridgeforge-contracts", activeWeeks: 9, releases90d: 2, tags90d: 1, lastPushDaysAgo: 6, stars: 870, latestTag: "v2.3.0" },
    endpoints: [
      { label: "Bridge app", path: "/app", uptime: 0.975 },
    ],
    lastVerifiedDaysAgo: 2,
    milestones: [
      { key: "bridge-v2", title: "Bridge v2", paraphrase: "Deploy bridge version 2 with upgraded verification.", importance: "core", sourcePath: "/roadmap#v2", claimDaysAgo: 340, deadlineInDays: -190, status: "shipped", deliveredInDays: -200, evidence: [{ type: "repository_release", title: "bridgeforge-contracts v2.0.0", summary: "Tagged release with deployment addresses.", path: "/repo/releases/v2.0.0", publishedDaysAgo: 200 }] },
      { key: "security-council", title: "Security council formation", paraphrase: "Form an independent security council with published members and powers.", importance: "major", sourcePath: "/roadmap#council", claimDaysAgo: 260, deadlineInDays: -110, status: "shipped", deliveredInDays: -100, previouslyDisputed: true, moderatorNote: "Initially disputed because member list was not public; resolved after the project published members and a charter.", evidence: [{ type: "official_announcement", title: "Security council charter and members", summary: "Docs page listing council members, powers and publication date.", path: "/docs/council", publishedDaysAgo: 100 }] },
      { key: "rate-limits", title: "Rate-limited withdrawals", paraphrase: "Add configurable rate limits on withdrawals for all supported assets.", importance: "major", sourcePath: "/roadmap#rate-limits", claimDaysAgo: 160, deadlineInDays: -50, status: "partially_shipped", deliveredInDays: -48, moderatorNote: "Rate limits documented for the two largest assets only.", evidence: [{ type: "official_announcement", title: "Rate limit documentation", summary: "Docs list limits per asset with an effective date.", path: "/docs/rate-limits", publishedDaysAgo: 48 }] },
      { key: "native-yield", title: "Native yield on bridged assets", paraphrase: "Enable yield on bridged assets.", importance: "minor", sourcePath: "/roadmap#yield", claimDaysAgo: 100, deadlineInDays: -20, status: "no_evidence", moderatorNote: "No qualifying evidence found as of the last check." },
      { key: "new-chain", title: "New chain integration", paraphrase: "Integrate one additional supported chain.", importance: "major", sourcePath: "/roadmap#new-chain", claimDaysAgo: 45, deadlineInDays: 9, status: "planned" },
    ],
  },
];

export const DEMO_DISPUTES: DisputeSpec[] = [
  {
    id: "dsp_nimbus_simulation",
    projectSlug: "nimbus-wallet",
    milestoneKey: "tx-simulation",
    evidenceIndex: 0,
    kind: "dispute",
    submitter: "aiko-tanaka",
    submitterKind: "community",
    claim: "The announcement describes simulation as rolling out, but the feature is only visible to users enrolled in the beta programme. The commitment says all users. Please review before counting this as shipped.",
    sourcePath: "/docs/beta-features",
    state: "open",
    createdDaysAgo: 40,
  },
  {
    id: "dsp_hollowmere_marketplace",
    projectSlug: "hollowmere-realms",
    milestoneKey: "marketplace",
    kind: "correction",
    submitter: "hollowmere-team",
    submitterKind: "project",
    claim: "We published a marketplace preview build to founder pass holders. We request the status be changed from no evidence to partially shipped. Conflict of interest: we are the project team.",
    sourcePath: "/blog/marketplace-preview",
    state: "under_review",
    createdDaysAgo: 12,
  },
  {
    id: "dsp_bridgeforge_council",
    projectSlug: "bridgeforge",
    milestoneKey: "security-council",
    kind: "dispute",
    submitter: "tomasz-rivera",
    submitterKind: "community",
    claim: "The council was announced but the member list and powers were not public at the time of the shipped status.",
    sourcePath: null,
    state: "resolved",
    resolution: "Project published the charter and member list. Status restored to shipped with the publication date as evidence; the prior dispute remains in the audit history.",
    createdDaysAgo: 105,
    resolvedDaysAgo: 98,
  },
];
