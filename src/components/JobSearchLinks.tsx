"use client";

import { useState } from "react";
import { trackProductEvent } from "@/lib/analytics";
import {
  buildSearchLinks,
  getCountry,
  SPECIALTIES,
  type SearchMode,
} from "@/lib/job-search";

// Specialty filter + pre-built search links for one country. Server pages
// render this with the country slug; picking a specialty rewrites the links
// locally (no requests — the URLs are computed from static data).
export default function JobSearchLinks({
  countrySlug,
  mode,
}: {
  countrySlug: string;
  mode: SearchMode;
}) {
  const [specialtySlug, setSpecialtySlug] = useState(SPECIALTIES[0].slug);
  const country = getCountry(countrySlug);
  if (!country) return null;

  const specialty =
    SPECIALTIES.find((s) => s.slug === specialtySlug) ?? SPECIALTIES[0];
  const links = buildSearchLinks(country, specialty, mode);

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-muted">اختر تخصصك:</p>
      <div className="mb-6 flex flex-wrap gap-2">
        {SPECIALTIES.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => setSpecialtySlug(s.slug)}
            className={
              s.slug === specialty.slug
                ? "rounded-full bg-brand-purple px-4 py-1.5 text-sm font-semibold text-white neon-glow"
                : "rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted hover:text-foreground"
            }
          >
            {s.labelAr}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            onClick={() =>
              trackProductEvent("job_apply_click", {
                source: link.name,
                country: country.slug,
                specialty: specialty.slug,
                mode,
              })
            }
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="glass card-glow block rounded-2xl p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold hover:neon-text">{link.name}</h3>
              <span aria-hidden className="text-brand-cyan">
                ↗
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {link.desc}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
