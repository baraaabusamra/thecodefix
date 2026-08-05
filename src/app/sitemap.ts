import type { MetadataRoute } from "next";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import { getPosts } from "@/lib/blog";
import { getJobs } from "@/lib/jobs";
import { COUNTRIES } from "@/lib/job-search";
import { getRoadmaps } from "@/lib/roadmaps";
import { getAcademicCourses } from "@/lib/academic";
import { REF_SECTIONS, getRefEntries } from "@/lib/reference";
import { SITE_URL as BASE } from "@/lib/site";
import lessonDates from "@/content/lesson-dates.json";

const LESSON_DATES = lessonDates as Record<string, string>;

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // [path, priority, changeFrequency]
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
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // Reference pages (المرجع): hub + per-section index + every entry.
  const referencePages: Entry[] = [
    {
      url: `${BASE}/reference`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...REF_SECTIONS.flatMap((s): Entry[] => [
      {
        url: `${BASE}/reference/${s.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      ...getRefEntries(s.slug).map(
        (e): Entry => ({
          url: `${BASE}/reference/${s.slug}/${e.slug}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.6,
        })
      ),
    ]),
  ];

  const roadmapPages: Entry[] = getRoadmaps().map((r) => ({
    url: `${BASE}/roadmaps/${r.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const academicPages: Entry[] = getAcademicCourses().map((c) => ({
    url: `${BASE}/academic/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogPages: Entry[] = getPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const jobPages: Entry[] = getJobs().map((j) => ({
    url: `${BASE}/jobs/${j.slug}`,
    lastModified: new Date(j.postedDate),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Per-country search-launcher pages (jobs + training).
  const countryPages: Entry[] = COUNTRIES.flatMap((c): Entry[] => [
    {
      url: `${BASE}/jobs/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE}/training/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ]);

  const tracks = await getTracks();
  const trackPageGroups = await Promise.all(
    tracks.map(async (t): Promise<Entry[]> => {
      const entries: Entry[] = [
        {
          url: `${BASE}/learn/${t.slug}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.9,
        },
        ...(await getLessons(t.slug)).map((l): Entry => {
          const dateKey = `${t.slug}/${l.slug}`;
          const known = LESSON_DATES[dateKey];
          return {
            url: `${BASE}/learn/${t.slug}/${l.slug}`,
            lastModified: known ? new Date(known) : now,
            changeFrequency: "monthly",
            priority: 0.8,
          };
        }),
      ];
      if (hasQuiz(t.slug)) {
        entries.push({
          url: `${BASE}/quiz/${t.slug}`,
          lastModified: now,
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
    ...academicPages,
    ...trackPages,
    ...blogPages,
    ...jobPages,
    ...countryPages,
  ];
}
