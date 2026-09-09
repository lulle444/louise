import type {
  AIPrediction,
  AuditLogEntry,
  Battle,
  Prediction,
  PriceSnapshot,
  Profile,
  SettlementRun,
  UserBadge,
  XpLedgerEntry,
} from "../../domain/types";

/** Mutable in-memory state for Demo Mode. */
export interface DemoState {
  anchor: string;
  /** When the seed finished building; rows created after this are runtime rows. */
  builtAt: string;
  battles: Battle[];
  predictions: Prediction[];
  aiPredictions: AIPrediction[];
  profiles: Profile[];
  userBadges: UserBadge[];
  xpLedger: XpLedgerEntry[];
  settlementRuns: SettlementRun[];
  priceSnapshots: PriceSnapshot[];
  audit: AuditLogEntry[];
  counters: Record<string, number>;
}

export function emptyState(anchor: string): DemoState {
  return {
    anchor,
    builtAt: new Date().toISOString(),
    battles: [],
    predictions: [],
    aiPredictions: [],
    profiles: [],
    userBadges: [],
    xpLedger: [],
    settlementRuns: [],
    priceSnapshots: [],
    audit: [],
    counters: {},
  };
}

export function nextId(state: DemoState, prefix: string): string {
  const n = (state.counters[prefix] ?? 0) + 1;
  state.counters[prefix] = n;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}
