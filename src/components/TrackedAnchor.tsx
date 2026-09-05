"use client";

import type { ComponentProps } from "react";
import { trackProductEvent } from "@/lib/analytics";
import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics-contract";

type Props<Name extends AnalyticsEventName> = Omit<
  ComponentProps<"a">,
  "onClick"
> & {
  event: Name;
  properties: AnalyticsEventMap[Name];
};

export default function TrackedAnchor<Name extends AnalyticsEventName>({
  event,
  properties,
  children,
  ...anchorProps
}: Props<Name>) {
  return (
    <a
      {...anchorProps}
      onClick={() => trackProductEvent(event, properties)}
    >
      {children}
    </a>
  );
}
