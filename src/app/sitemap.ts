import type { MetadataRoute } from "next";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import { getPosts } from "@/lib/blog";
import { getJobs } from "@/lib/jobs";
import { getRoadmaps } from "@/lib/roadmaps";
import { SITE_URL as BASE } from "@/lib/site";

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // [path, priority, changeFrequency]
  const staticDefs: [string, number, Entry["changeFrequency"]][] = [
    ["", 1.0, "daily"],
    ["/learn", 0.9, "weekly"],
    ["/roadmaps", 0.8, "weekly"],
    ["/playground", 0.7, "monthly"],
    ["/blog", 0.7, "weekly"],
    ["/jobs", 0.7, "daily"],
    ["/pricing", 0.5, "monthly"],
    ["/about", 0.4, "yearly"],
    ["/contact", 0.4, "yearly"],
    ["/account", 0.3, "monthly"],
    ["/privacy", 0.2, "yearly"],
    ["/terms", 0.2, "yearly"],
  ];
  const staticPages: Entry[] = staticDefs.map(([p, priority, changeFrequency]) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const roadmapPages: Entry[] = getRoadmaps().map((r) => ({
    url: `${BASE}/roadmaps/${r.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
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
        ...(await getLessons(t.slug)).map((l): Entry => ({
          url: `${BASE}/learn/${t.slug}/${l.slug}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.8,
        })),
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
    ...roadmapPages,
    ...trackPages,
    ...blogPages,
    ...jobPages,
  ];
}
