"use client";

import { useEffect } from "react";
import { trackProductEvent } from "@tcf/observability/analytics";

export default function TrackView({ track }: { track: string }) {
  useEffect(() => {
    trackProductEvent("track_view", { track });
  }, [track]);

  return null;
}
