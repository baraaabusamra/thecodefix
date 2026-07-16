import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private/utility areas — no SEO value, keep crawlers out.
      // (/search stays crawlable: it's noindex+follow so links still get discovered.)
      disallow: ["/admin", "/account", "/login", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
