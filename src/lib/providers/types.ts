import type { GithubSnapshot, WebsiteCheck } from "@/lib/domain/types";

/**
 * Provider abstractions. Each integration exposes `isConfigured()` and a
 * fetch method returning an observation with its own retrieval timestamp.
 * Observations are stored as-is; they never change verified status directly.
 */
export interface RepositoryProvider {
  readonly name: string;
  isConfigured(): boolean;
  fetchSnapshot(input: { repositoryId: string; projectId: string; owner: string; repo: string }): Promise<Omit<GithubSnapshot, "id">>;
}

export interface WebsiteHealthProvider {
  readonly name: string;
  isConfigured(): boolean;
  check(input: { endpointId: string; projectId: string; url: string }): Promise<Omit<WebsiteCheck, "id">>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(name: string) {
    super(`${name} provider is not configured`);
    this.name = "ProviderNotConfiguredError";
  }
}
