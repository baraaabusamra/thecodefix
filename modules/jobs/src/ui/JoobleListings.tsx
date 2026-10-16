import { isJoobleEnabled, searchJooble } from "../jooble";
import { SPECIALTIES, type Country, type SearchMode } from "../search";
import TrackedAnchor from "@tcf/ui/ui/TrackedAnchor";

// Real aggregated listings from Jooble for a country page. Server component,
// runs at build/ISR regeneration only. Renders nothing when the API key is
// missing or the search comes back empty — the smart search links below the
// section always remain the reliable path.
export default async function JoobleListings({
  country,
  mode,
}: {
  country: Country;
  mode: SearchMode;
}) {
  if (!isJoobleEnabled()) return null;

  // Listings use the general specialty; the client-side specialty filter
  // applies to the search links, which cover narrower queries.
  const jobs = await searchJooble(country, SPECIALTIES[0], mode);
  if (jobs.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">
          أحدث {mode === "training" ? "فرص التدريب" : "الإعلانات"}
        </h2>
        <span className="shrink-0 text-xs text-muted">
          تُحدَّث تلقائيًا · المصدر: Jooble
        </span>
      </div>
      <div className="space-y-4">
        {jobs.map((job) => (
          <TrackedAnchor
            key={job.id}
            href={job.link}
            event="job_apply_click"
            properties={{ source: "jooble", country: country.slug, mode }}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="glass card-glow block rounded-2xl p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold hover:neon-text">
                  {job.title}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {[job.company, job.location].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span aria-hidden className="shrink-0 text-brand-cyan">
                ↗
              </span>
            </div>
            {job.snippet && (
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {job.snippet}…
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {job.salary && (
                <span className="rounded-lg bg-background px-2 py-1 text-xs font-semibold text-brand-cyan">
                  💰 {job.salary}
                </span>
              )}
              {job.source && (
                <span className="rounded-lg bg-background px-2 py-1 text-xs text-muted">
                  التقديم عبر {job.source}
                </span>
              )}
            </div>
          </TrackedAnchor>
        ))}
      </div>
    </section>
  );
}
