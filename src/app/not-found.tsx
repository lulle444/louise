import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <EmptyState title="Signal not found" description="This page, Battle or Signal Card does not exist or is not public." action={{ href: "/arena", label: "Back to the Arena" }} />
    </div>
  );
}
