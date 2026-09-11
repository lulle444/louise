import { getConfig } from "@/lib/config";
import type { WebsiteCheck } from "@/lib/domain/types";
import { validatePublicUrl } from "@/lib/domain/url";
import { ProviderNotConfiguredError, type WebsiteHealthProvider } from "./types";

/**
 * Website health provider. Only approved public URLs are checked. A single
 * failed check is stored as an observation and never interpreted as
 * abandonment; the availability component uses a rolling window.
 */
export class WebsiteProvider implements WebsiteHealthProvider {
  readonly name = "website";

  isConfigured(): boolean {
    return !!getConfig().websiteCheckSecret;
  }

  async check(input: { endpointId: string; projectId: string; url: string }): Promise<Omit<WebsiteCheck, "id">> {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError(this.name);
    const valid = validatePublicUrl(input.url);
    const checkedAt = new Date().toISOString();
    if (!valid.ok) {
      return { endpointId: input.endpointId, projectId: input.projectId, httpStatus: null, ok: false, latencyMs: null, error: valid.error, checkedAt };
    }
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(valid.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "shiptrace-health-check/1.0 (+https://shiptrace.example)" },
        cache: "no-store",
      });
      return {
        endpointId: input.endpointId,
        projectId: input.projectId,
        httpStatus: res.status,
        ok: res.status >= 200 && res.status < 400,
        latencyMs: Date.now() - started,
        error: null,
        checkedAt,
      };
    } catch (error) {
      return {
        endpointId: input.endpointId,
        projectId: input.projectId,
        httpStatus: null,
        ok: false,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message.slice(0, 200) : "Request failed",
        checkedAt,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export const websiteProvider = new WebsiteProvider();
