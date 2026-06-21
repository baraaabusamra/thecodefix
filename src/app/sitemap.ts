import type { MetadataRoute } from "next";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import { getPosts } from "@/lib/blog";
import { getJobs } from "@/lib/jobs";
import { getRoadmaps } from "@/lib/roadmaps";
import { SITE_URL as BASE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    "",
    "/learn",
    "/playground",
    "/jobs",
    "/pricing",
    "/account",
    "/blog",
    "/roadmaps",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
  ].map((p) => ({ url: `${BASE}${p}`, lastModified: new Date() }));

  const roadmapPages = getRoadmaps().map((r) => ({
    url: `${BASE}/roadmaps/${r.slug}`,
    lastModified: new Date(),
  }));

  const blogPages = getPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
  }));

  const jobPages = getJobs().map((j) => ({
    url: `${BASE}/jobs/${j.slug}`,
    lastModified: new Date(j.postedDate),
  }));

  const tracks = await getTracks();
  const trackPageGroups = await Promise.all(
    tracks.map(async (t) => {
      const entries = [
        { url: `${BASE}/learn/${t.slug}`, lastModified: new Date() },
        ...(await getLessons(t.slug)).map((l) => ({
          url: `${BASE}/learn/${t.slug}/${l.slug}`,
          lastModified: new Date(),
        })),
      ];
      if (hasQuiz(t.slug)) {
        entries.push({ url: `${BASE}/quiz/${t.slug}`, lastModified: new Date() });
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
