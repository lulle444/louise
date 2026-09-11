import { BadgeCheck, Clock, FileQuestion, XOctagon } from "lucide-react";
import { EVIDENCE_RANK, EVIDENCE_TYPE_LABELS } from "@/lib/domain/evidence";
import type { EvidenceType, ReviewState } from "@/lib/domain/types";
import { cn } from "@/components/ui";

export function EvidenceTypeBadge({ type, className }: { type: EvidenceType; className?: string }) {
  return (
    <span className={cn("stamp text-violet", className)} title="Evidence hierarchy tier (1 is strongest)">
      Tier {EVIDENCE_RANK[type]} · {EVIDENCE_TYPE_LABELS[type]}
    </span>
  );
}

const REVIEW_META: Record<ReviewState, { label: string; tone: string; Icon: typeof BadgeCheck }> = {
  accepted: { label: "Verified from public evidence", tone: "text-mint", Icon: BadgeCheck },
  pending: { label: "Pending moderation · unverified", tone: "text-amber", Icon: Clock },
  needs_clarification: { label: "Clarification requested · unverified", tone: "text-amber", Icon: FileQuestion },
  rejected: { label: "Not accepted", tone: "text-coral", Icon: XOctagon },
};

export function ReviewStamp({ state, className }: { state: ReviewState; className?: string }) {
  const { label, tone, Icon } = REVIEW_META[state];
  return (
    <span className={cn("stamp", tone, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
