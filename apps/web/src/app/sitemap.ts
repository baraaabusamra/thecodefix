import type { MetadataRoute } from "next";
import { getTracks, getLessons } from "@tcf/content/tracks";
import { hasTrackAssessment } from "@tcf/assessment/quiz-bank";
import { getPosts } from "@tcf/content/blog";
import { getJobs } from "@tcf/jobs/jobs";
import { COUNTRIES } from "@tcf/jobs/search";
import { getRoadmaps } from "@tcf/content/roadmaps";
import { getAcademicCourses } from "@tcf/academic/courses";
import {
  getAcademicCountrySlugs,
  getUniversities,
  getSpecialization,
} from "@tcf/academic/universities";
import { getStudyPlan } from "@tcf/academic/study-plans";
import { isStudyPlanPublishable } from "@tcf/academic/indexability";
import { REF_SECTIONS, getRefEntries } from "@tcf/content/reference";
import { SITE_URL as BASE } from "@tcf/core/site";
import lessonDates from "@tcf/content/lesson-dates";

const LESSON_DATES = lessonDates as Record<string, string>;

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // No global "now" fallback anywhere in this file. Every entry below either
  // carries a real, content-derived modification date, or omits
  // lastModified entirely (MetadataRoute.Sitemap's lastModified is
  // optional) — never a build/deploy/request-time stand-in. A fake lastmod
  // is worse than none: it teaches Google the field can't be trusted for
  // this site, for every URL, not just the ones that actually lack a date.
  // See docs/seo-technical-policy.md §1 (lastmod audit).

  // [path, priority, changeFrequency] — none of these hand-authored pages
  // have a tracked content-modification date, so lastModified is omitted.
  const staticDefs: [string, number, Entry["changeFrequency"]][] = [
    ["", 1.0, "daily"],
    ["/learn", 0.9, "weekly"],
    ["/roadmaps", 0.8, "weekly"],
    ["/academic", 0.7, "weekly"],
    ["/playground", 0.7, "monthly"],
    ["/leaderboard", 0.6, "daily"],
    ["/blog", 0.7, "weekly"],
    ["/jobs", 0.7, "daily"],
    ["/training", 0.7, "weekly"],
    ["/pricing", 0.5, "monthly"],
    ["/about", 0.4, "yearly"],
    ["/contact", 0.4, "yearly"],
    ["/privacy", 0.2, "yearly"],
    ["/terms", 0.2, "yearly"],
  ];
  const staticPages: Entry[] = staticDefs.map(([p, priority, changeFrequency]) => ({
    url: `${BASE}${p}`,
    changeFrequency,
    priority,
  }));

  // Reference pages (المرجع): hub + per-section index + every entry. No
  // per-entry modification date is tracked today (no reference-dates.json
  // equivalent of lesson-dates.json) — omit rather than fabricate one.
  const referencePages: Entry[] = [
    {
      url: `${BASE}/reference`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...REF_SECTIONS.flatMap((s): Entry[] => [
      {
        url: `${BASE}/reference/${s.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      // noindex entries (their lesson ranks instead) stay out of the sitemap.
      ...getRefEntries(s.slug)
        .filter((e) => !e.noindex)
        .map(
          (e): Entry => ({
            url: `${BASE}/reference/${s.slug}/${e.slug}`,
            changeFrequency: "monthly",
            priority: 0.6,
          })
        ),
    ]),
  ];

  const roadmapPages: Entry[] = getRoadmaps().map((r) => ({
    url: `${BASE}/roadmaps/${r.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const academicCoursePages: Entry[] = [
    {
      url: `${BASE}/academic/courses`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...getAcademicCourses().map(
      (c): Entry => ({
        url: `${BASE}/academic/courses/${c.slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      })
    ),
  ];

  // Academic universities: country → university → specialization, all built
  // only for countries with real, verified data (see lib/academic-universities.ts).
  // The specialization tier is additionally gated by isStudyPlanPublishable
  // (modules/academic/src/indexability.ts) — the SAME Quality Gate the
  // specialization page and its generateMetadata use. Only combos with a
  // real, complete, sourced study plan appear here; everything else is a
  // real, crawlable, noindex,follow page (see
  // reports/seo-spam-audit-2026-08-28/phase-1-remediation-result.md) that
  // must NOT be advertised for indexing via the sitemap. University hub and
  // country pages follow the same rule one level up: listed only when they
  // lead to at least one published study plan. The noindex pages themselves
  // are listed temporarily in /academic/sitemap.xml so Google recrawls them.
  const academicCountrySlugs = getAcademicCountrySlugs();
  const academicUniversityPages: Entry[] = (
    await Promise.all(
      academicCountrySlugs.map(async (country): Promise<Entry[]> => {
        const universityGroups = await Promise.all(
          getUniversities(country).map(async (u): Promise<Entry[]> => {
            const specializationEntries = await Promise.all(
              u.specializations
                .filter((s) => getSpecialization(s))
                .map(async (s): Promise<Entry | null> => {
                  const plan = await getStudyPlan(country, u.slug, s);
                  if (!isStudyPlanPublishable(plan)) return null;
                  return {
                    url: `${BASE}/academic/${country}/${u.slug}/${s}`,
                    // Real content-update timestamp, never "now" — see
                    // StudyPlan.updatedAt in academic-study-plans.ts.
                    lastModified: plan.updatedAt,
                    changeFrequency: "monthly",
                    priority: 0.5,
                  };
                })
            );
            const published = specializationEntries.filter((e): e is Entry => e !== null);
            // A university hub is advertised only when it has at least one
            // published study plan — the same rule its page's robots meta
            // follows (isUniversityIndexable in modules/academic/src/indexability.ts).
            if (published.length === 0) return [];
            return [
              {
                url: `${BASE}/academic/${country}/${u.slug}`,
                // No real per-university modification date; specialization
                // pages below are the only academic tier with one.
                changeFrequency: "monthly",
                priority: 0.5,
              },
              ...published,
            ];
          })
        );
        const universityEntries = universityGroups.flat();
        // A country page is advertised only when one of its universities is
        // (isCountryIndexable in modules/academic/src/indexability.ts).
        if (universityEntries.length === 0) return [];
        return [
          {
            url: `${BASE}/academic/${country}`,
            changeFrequency: "monthly",
            priority: 0.6,
          },
          ...universityEntries,
        ];
      })
    )
  ).flat();

  const blogPages: Entry[] = getPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    // Same date the post's JSON-LD dateModified uses (apps/web/src/app/blog/[slug]/
    // page.tsx). `updated` changes only with a real content rewrite
    // (docs/seo-technical-policy.md §13), so a rewritten post tells Google
    // it changed instead of keeping its first-publish date forever.
    lastModified: new Date(p.updated ?? p.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const jobPages: Entry[] = getJobs().map((j) => ({
    url: `${BASE}/jobs/${j.slug}`,
    lastModified: new Date(j.postedDate),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Per-country search-launcher pages (jobs + training) — dynamic listing
  // pages with no per-country content-modification date; omit.
  const countryPages: Entry[] = COUNTRIES.flatMap((c): Entry[] => [
    {
      url: `${BASE}/jobs/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE}/training/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ]);

  const tracks = await getTracks();
  const trackPageGroups = await Promise.all(
    tracks.map(async (t): Promise<Entry[]> => {
      const entries: Entry[] = [
        {
          // No real per-track "landing page" modification date is tracked
          // (only individual lessons are, via lesson-dates.json below).
          url: `${BASE}/learn/${t.slug}`,
          changeFrequency: "weekly",
          priority: 0.9,
        },
        ...(await getLessons(t.slug)).map((l): Entry => {
          const dateKey = `${t.slug}/${l.slug}`;
          const known = LESSON_DATES[dateKey];
          return {
            url: `${BASE}/learn/${t.slug}/${l.slug}`,
            // Real git-history date when known (see lesson-dates.json /
            // scripts/generate-lesson-dates.mjs); omitted — never "now" —
            // for the rare lesson added since the last `dates:generate` run.
            ...(known ? { lastModified: new Date(known) } : {}),
            changeFrequency: "monthly",
            priority: 0.8,
          };
        }),
      ];
      if (hasTrackAssessment(t.slug)) {
        entries.push({
          url: `${BASE}/quiz/${t.slug}`,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
      return entries;
    })
  );
  const trackPages = trackPageGroups.flat();

  return [
    ...staticPages,
    ...referencePages,
    ...roadmapPages,
    ...academicCoursePages,
    ...academicUniversityPages,
    ...trackPages,
    ...blogPages,
    ...jobPages,
    ...countryPages,
  ];
}
