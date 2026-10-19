import type { MetadataRoute } from "next";
import { SITE_URL } from "@tcf/core/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private/utility areas — no SEO value, keep crawlers out.
      // (/search stays crawlable: it's noindex+follow so links still get discovered.)
      // /account and /login are intentionally NOT disallowed here even though
      // they're private: they already carry a page-level noindex meta tag,
      // and Google can only honor that tag if it's allowed to crawl the page.
      // Blocking them in robots.txt instead prevents Google from ever seeing
      // the noindex tag, so a linked URL can still get indexed bare (GSC:
      // "Indexed, though blocked by robots.txt") — the opposite of the goal.
      disallow: ["/admin", "/api/"],
    },
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      // Temporary: noindex academic pages Google indexed before the gates
      // shipped, listed so they get recrawled and dropped. Returns an empty
      // list after RECRAWL_UNTIL (apps/web/src/app/academic/sitemap.ts); remove this
      // line and that file then.
      `${SITE_URL}/academic/sitemap.xml`,
    ],
  };
}
