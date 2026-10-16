import Link from "next/link";
import JsonLd from "./JsonLd";
import { SITE_URL } from "@tcf/core/site";

export type Crumb = { name: string; href: string };

// Visible breadcrumb trail + matching BreadcrumbList JSON-LD (SEO). RTL-aware
// separators. Pass an ordered list from root → current page.
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: `${SITE_URL}${c.href}`,
          })),
        }}
      />
      <nav aria-label="مسار التنقّل" className="mb-3 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((c, i) => {
            const last = i === items.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-1">
                {last ? (
                  <span className="text-foreground" aria-current="page">
                    {c.name}
                  </span>
                ) : (
                  <Link href={c.href} className="hover:text-foreground">
                    {c.name}
                  </Link>
                )}
                {!last && <span className="text-muted/60">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
