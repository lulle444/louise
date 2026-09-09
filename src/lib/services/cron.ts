import type { ArenaRepository } from "../data/repository";
import type { MarketDataProvider } from "../market/provider";
import { ensureBattleOpened } from "./lifecycle";
import { settleBattle, type SettlementOutcome } from "./settlement";

export interface CronReport {
  opened: string[];
  settled: Array<{ battleId: string; status: SettlementOutcome["status"]; message: string }>;
  errors: string[];
}

/** Bring every published Battle up to date: capture opens, lock AI, settle ended Battles. */
export async function runScheduledMaintenance(repo: ArenaRepository, provider: MarketDataProvider, actorId: string | null, now = new Date()): Promise<CronReport> {
  const report: CronReport = { opened: [], settled: [], errors: [] };
  const battles = await repo.listBattles({ includeUnpublished: true });
  const assets = await repo.listAssets();
  for (const battle of battles) {
    const asset = assets.find((a) => a.id === battle.assetId);
    if (!asset) continue;
    try {
      if ((battle.status === "upcoming" || battle.status === "open") && now.getTime() >= Date.parse(battle.opensAt)) {
        const before = battle.startPrice;
        const updated = await ensureBattleOpened(repo, provider, battle, asset, now);
        if (before === null && updated.startPrice !== null) report.opened.push(battle.id);
      }
      if (["upcoming", "open", "locked"].includes(battle.status) && now.getTime() >= Date.parse(battle.endsAt)) {
        const result = await settleBattle(repo, provider, battle.id, { source: "cron", actorId, now });
        report.settled.push({ battleId: battle.id, status: result.status, message: result.message });
      }
    } catch (err) {
      report.errors.push(`${battle.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return report;
}
