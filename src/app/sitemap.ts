import type { MetadataRoute } from "next";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import { getPosts } from "@/lib/blog";
import { SITE_URL as BASE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/learn",
    "/playground",
    "/jobs",
    "/pricing",
    "/account",
    "/blog",
  ].map((p) => ({ url: `${BASE}${p}`, lastModified: new Date() }));

  const blogPages = getPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
  }));

  const trackPages = getTracks().flatMap((t) => {
    const entries = [
      { url: `${BASE}/learn/${t.slug}`, lastModified: new Date() },
      ...getLessons(t.slug).map((l) => ({
        url: `${BASE}/learn/${t.slug}/${l.slug}`,
        lastModified: new Date(),
      })),
    ];
    if (hasQuiz(t.slug)) {
      entries.push({ url: `${BASE}/quiz/${t.slug}`, lastModified: new Date() });
    }
    return entries;
  });

  return [...staticPages, ...trackPages, ...blogPages];
}
