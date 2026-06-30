"use client";

import Link from "next/link";
import { track as trackEvent } from "@vercel/analytics/react";

// A Link that fires a Vercel Analytics event on click — used to instrument
// funnel CTAs from otherwise-static (Server Component) pages.
export default function TrackedCta({
  href,
  event,
  className,
  children,
}: {
  href: string;
  event: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackEvent(event)}>
      {children}
    </Link>
  );
}
