"use client";

import Link from "next/link";
import { trackProductEvent } from "@tcf/observability/analytics";
import type { AnalyticsEventMap, AnalyticsEventName } from "@tcf/observability/analytics-contract";

// A Link that fires a Vercel Analytics event on click — used to instrument
// funnel CTAs from otherwise-static (Server Component) pages.
export default function TrackedCta<Name extends AnalyticsEventName>({
  href,
  event,
  properties,
  className,
  children,
}: {
  href: string;
  event: Name;
  properties: AnalyticsEventMap[Name];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackProductEvent(event, properties)}
    >
      {children}
    </Link>
  );
}
