import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <div className="py-16">
      <EmptyState
        title="Not found"
        description="That page, Race, narrative, or player doesn't exist."
        action={
          <Link href="/" className="btn btn-primary">
            Back to the paddock
          </Link>
        }
      />
    </div>
  );
}
