import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <EmptyState title="Signal not found" description="This page, Round or Call Card does not exist or is not public." action={{ href: "/rounds", label: "Back to Callscore" }} />
    </div>
  );
}
