import type { MetadataRoute } from "next";
import { getNoindexAcademicPages, type NoindexAcademicPage } from "@tcf/academic/indexability";
import { SITE_URL as BASE } from "@tcf/core/site";

// TEMPORARY recrawl sitemap — served at /academic/sitemap.xml and listed in
// robots.txt next to the main sitemap.
//
// Why: 1,037 specialization pages, 395 university hubs and 21 country pages
// render only names, not real study plans. They are noindex,follow (see
// modules/academic/src/indexability.ts) and out of /sitemap.xml, but Google
// indexed many of them before those gates shipped and has not been back:
// Search Console showed 115 /academic/ URLs with impressions between
// 2026-09-01 and 2026-10-18, and URL Inspection of
// /academic/sudan/red-sea-university-sudan/computer-science gave
// "Submitted and indexed", last crawled 2026-08-08. Listing them here gets
// them recrawled, so Google sees the noindex and drops them. Search Console
// will report them as "Submitted URL marked noindex" meanwhile; that is the
// expected signal, not an error.
//
// lastModified is the real date each tier's robots meta changed to noindex
// (the head of the page did change then), never a build-time date.
//
// After RECRAWL_UNTIL this returns an empty list; then delete this file and
// its line in apps/web/src/app/robots.ts.
const RECRAWL_UNTIL = "2026-12-31";

const NOINDEX_SINCE: Record<NoindexAcademicPage["tier"], string> = {
  specialization: "2026-09-04", // isStudyPlanPublishable gate (c67291b)
  university: "2026-10-16", // isUniversityIndexable gate (cae56fa)
  country: "2026-10-19", // isCountryIndexable gate
};

// Re-evaluate daily so the expiry takes effect without a redeploy.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (Date.now() > Date.parse(`${RECRAWL_UNTIL}T23:59:59Z`)) return [];
  const pages = await getNoindexAcademicPages();
  return pages.map(({ path, tier }) => ({
    url: `${BASE}${path}`,
    lastModified: NOINDEX_SINCE[tier],
  }));
}
