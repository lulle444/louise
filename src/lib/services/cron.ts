import { getConfig } from "@/lib/config";
import { getDataSource } from "@/lib/data";
import { githubProvider } from "@/lib/providers/github";
import { websiteProvider } from "@/lib/providers/website";
import { recalculateProjectScore } from "./scores";

export interface JobResult {
  job: string;
  configured: boolean;
  processed: number;
  created: number;
  skipped: number;
  errors: { id: string; message: string }[];
  ranAt: string;
}

/** Verify the Vercel cron bearer secret. Returns false when CRON_SECRET is unset. */
export function authorizeCron(request: Request): boolean {
  const secret = getConfig().cronSecret;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

/** Fetch GitHub snapshots for every listed repository. Idempotent per repository per day. */
export async function runGithubJob(): Promise<JobResult> {
  const result: JobResult = { job: "github", configured: githubProvider.isConfigured(), processed: 0, created: 0, skipped: 0, errors: [], ranAt: new Date().toISOString() };
  if (!result.configured) return result;
  const ds = await getDataSource();
  const repos = await ds.listGithubRepositories();
  for (const repo of repos) {
    result.processed += 1;
    try {
      const snapshot = await githubProvider.fetchSnapshot({ repositoryId: repo.id, projectId: repo.projectId, owner: repo.owner, repo: repo.repo });
      const { created } = await ds.recordGithubSnapshot(snapshot);
      if (created) result.created += 1;
      else result.skipped += 1;
    } catch (error) {
      result.errors.push({ id: repo.id, message: error instanceof Error ? error.message : "unknown error" });
    }
  }
  return result;
}

/** Check every approved endpoint. Idempotent per endpoint per 10-minute bucket. */
export async function runWebsiteJob(): Promise<JobResult> {
  const result: JobResult = { job: "website", configured: websiteProvider.isConfigured(), processed: 0, created: 0, skipped: 0, errors: [], ranAt: new Date().toISOString() };
  if (!result.configured) return result;
  const ds = await getDataSource();
  const endpoints = (await ds.listWebsiteEndpoints()).filter((e) => e.approved);
  for (const endpoint of endpoints) {
    result.processed += 1;
    try {
      const check = await websiteProvider.check({ endpointId: endpoint.id, projectId: endpoint.projectId, url: endpoint.url });
      const { created } = await ds.recordWebsiteCheck(check);
      if (created) result.created += 1;
      else result.skipped += 1;
    } catch (error) {
      result.errors.push({ id: endpoint.id, message: error instanceof Error ? error.message : "unknown error" });
    }
  }
  return result;
}

/** Recalculate all published projects with the current formula and append snapshots. */
export async function runScoresJob(): Promise<JobResult> {
  const result: JobResult = { job: "scores", configured: true, processed: 0, created: 0, skipped: 0, errors: [], ranAt: new Date().toISOString() };
  const ds = await getDataSource();
  const summaries = await ds.listProjectSummaries();
  for (const s of summaries) {
    result.processed += 1;
    try {
      await recalculateProjectScore(ds, s.project.id, { actor: null });
      result.created += 1;
    } catch (error) {
      result.errors.push({ id: s.project.id, message: error instanceof Error ? error.message : "unknown error" });
    }
  }
  return result;
}
