import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProofCard } from "@/components/ProofCard";
import { ShareButtons } from "@/components/ShareButtons";
import { Alert, ButtonLink } from "@/components/ui";
import { getConfig } from "@/lib/config";
import { getDataSource } from "@/lib/data";
import { EVIDENCE_TYPE_LABELS } from "@/lib/domain/evidence";
import { STATUS_LABELS } from "@/lib/domain/status";

export const dynamic = "force-dynamic";

async function load(evidenceId: string) {
  const ds = await getDataSource();
  const evidence = await ds.getEvidence(evidenceId);
  if (!evidence) return null;
  const [project, milestone] = await Promise.all([ds.getProjectById(evidence.projectId), evidence.milestoneId ? ds.getMilestone(evidence.milestoneId) : Promise.resolve(null)]);
  if (!project || project.status !== "published") return null;
  return { evidence, project, milestone };
}

export async function generateMetadata({ params }: { params: Promise<{ evidenceId: string }> }): Promise<Metadata> {
  const { evidenceId } = await params;
  const data = await load(evidenceId);
  if (!data) return { title: "Proof card not found" };
  const { evidence, project, milestone } = data;
  const status = milestone ? STATUS_LABELS[milestone.status] : "";
  const title = `${project.name}: ${evidence.title}`;
  const description = `${evidence.reviewState === "accepted" ? "Verified from public evidence" : "Pending moderation"} · ${EVIDENCE_TYPE_LABELS[evidence.type]}${milestone ? ` · ${milestone.title} — ${status}` : ""}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article", url: `${getConfig().appUrl}/proof/${evidence.id}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProofPage({ params }: { params: Promise<{ evidenceId: string }> }) {
  const { evidenceId } = await params;
  const data = await load(evidenceId);
  if (!data) notFound();
  const { evidence, project, milestone } = data;
  const url = `${getConfig().appUrl}/proof/${evidence.id}`;
  const shareText = `${project.name}: ${evidence.title} — ${evidence.reviewState === "accepted" ? "verified from public evidence" : "pending review"} on SHIPTRACE`;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ProofCard evidence={evidence} milestone={milestone} project={project} />
      {evidence.reviewState !== "accepted" ? (
        <Alert tone="amber" title="Unverified submission">
          This evidence has not been accepted by a moderator. It does not affect the milestone status or Ship Score.
        </Alert>
      ) : null}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <ShareButtons url={url} text={shareText} />
        {milestone ? (
          <ButtonLink href={`/projects/${project.slug}/milestones/${milestone.id}`} variant="secondary">
            Open Evidence Room
          </ButtonLink>
        ) : (
          <ButtonLink href={`/projects/${project.slug}`} variant="secondary">
            Open project
          </ButtonLink>
        )}
      </div>
      <p className="text-xs text-slate">
        Proof cards summarise a single evidence record. They are not endorsements. See the{" "}
        <Link href="/methodology" className="text-primary underline underline-offset-4">
          methodology
        </Link>{" "}
        for how evidence is ranked and reviewed.
      </p>
    </div>
  );
}
