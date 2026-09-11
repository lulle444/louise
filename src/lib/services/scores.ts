import type { DataSource } from "@/lib/data/types";
import { CURRENT_FORMULA_VERSION, computeShipScore } from "@/lib/domain/score";
import type { SessionUser, ShipScoreSnapshot } from "@/lib/domain/types";

/** Recalculate a project's Ship Score and append a new snapshot (history is never rewritten). */
export async function recalculateProjectScore(
  ds: DataSource,
  projectId: string,
  options: { version?: string; actor?: SessionUser | null; now?: Date } = {},
): Promise<ShipScoreSnapshot> {
  const project = await ds.getProjectById(projectId);
  if (!project) throw new Error("Project not found");
  const [milestones, evidence, githubSnapshots, websiteChecks] = await Promise.all([
    ds.listMilestones({ projectId }),
    ds.listEvidence({ projectId }),
    ds.listGithubSnapshots(projectId),
    ds.listWebsiteChecks(projectId),
  ]);
  const snapshot = computeShipScore(
    { project, milestones, evidence, githubSnapshots, websiteChecks, now: options.now },
    options.version ?? CURRENT_FORMULA_VERSION,
  );
  return ds.recordScoreSnapshot(snapshot, options.actor ?? null);
}
