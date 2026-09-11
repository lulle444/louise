import { getConfig } from "@/lib/config";
import type { GithubSnapshot } from "@/lib/domain/types";
import { ProviderNotConfiguredError, type RepositoryProvider } from "./types";

const API = "https://api.github.com";
const DAY = 86_400_000;

interface RepoResponse {
  default_branch: string;
  stargazers_count: number;
  open_issues_count: number;
  pushed_at: string | null;
}
interface ReleaseResponse {
  tag_name: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
}
interface TagResponse {
  name: string;
}
interface CommitResponse {
  commit: { committer: { date: string } | null; author: { date: string } | null };
}

/**
 * GitHub metadata provider. Fetches public repository metadata, releases, tags
 * and recent activity. Cached by Next's fetch cache for six hours. Commit
 * counts are never treated as proof of delivery — only releases/tags and
 * activity continuity feed the development component.
 */
export class GithubProvider implements RepositoryProvider {
  readonly name = "github";

  isConfigured(): boolean {
    return !!getConfig().githubToken;
  }

  private async get<T>(path: string): Promise<T> {
    const token = getConfig().githubToken;
    if (!token) throw new ProviderNotConfiguredError(this.name);
    const res = await fetch(`${API}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "shiptrace",
      },
      next: { revalidate: 6 * 3600 },
    });
    if (!res.ok) throw new Error(`GitHub ${path} responded ${res.status}`);
    return (await res.json()) as T;
  }

  async fetchSnapshot(input: { repositoryId: string; projectId: string; owner: string; repo: string }): Promise<Omit<GithubSnapshot, "id">> {
    const base = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`;
    const now = new Date();
    const since = new Date(now.getTime() - 84 * DAY).toISOString();
    const [repo, releases, tags, commits] = await Promise.all([
      this.get<RepoResponse>(base),
      this.get<ReleaseResponse[]>(`${base}/releases?per_page=50`),
      this.get<TagResponse[]>(`${base}/tags?per_page=50`),
      this.get<CommitResponse[]>(`${base}/commits?since=${encodeURIComponent(since)}&per_page=100`),
    ]);
    const ninetyDaysAgo = now.getTime() - 90 * DAY;
    const published = releases.filter((r) => !r.draft && r.published_at);
    const releasesLast90d = published.filter((r) => new Date(r.published_at!).getTime() >= ninetyDaysAgo).length;
    const latest = published.sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))[0] ?? null;
    const weeks = new Set<number>();
    for (const c of commits) {
      const date = c.commit.committer?.date ?? c.commit.author?.date;
      if (!date) continue;
      weeks.add(Math.floor((now.getTime() - new Date(date).getTime()) / (7 * DAY)));
    }
    return {
      repositoryId: input.repositoryId,
      projectId: input.projectId,
      defaultBranch: repo.default_branch,
      stars: repo.stargazers_count,
      openIssues: repo.open_issues_count,
      latestReleaseTag: latest?.tag_name ?? null,
      latestReleaseAt: latest?.published_at ?? null,
      releasesLast90d,
      // Tags without release metadata have no reliable date via this endpoint; count only those matching recent releases.
      tagsLast90d: tags.filter((t) => published.some((r) => r.tag_name === t.name && new Date(r.published_at!).getTime() >= ninetyDaysAgo)).length,
      activeWeeksLast12: Math.min(12, weeks.size),
      lastPushAt: repo.pushed_at,
      source: "github_api",
      retrievedAt: now.toISOString(),
    };
  }
}

export const githubProvider = new GithubProvider();
