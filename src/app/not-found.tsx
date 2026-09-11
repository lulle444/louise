import { ButtonLink } from "@/components/ui";
import { BrandImage } from "@/components/BrandImage";
import { ProjectSearch } from "@/components/ProjectSearch";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <BrandImage name="calendar" className="mb-6" sizes="(min-width: 640px) 32rem, 100vw" />
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">No record found at this address</h1>
      <p className="mt-2 text-sm text-slate">The project, milestone, or proof card you requested does not exist or is not published.</p>
      <div className="mt-6">
        <ProjectSearch />
      </div>
      <div className="mt-4">
        <ButtonLink href="/projects" variant="secondary">
          Browse all projects
        </ButtonLink>
      </div>
    </div>
  );
}
