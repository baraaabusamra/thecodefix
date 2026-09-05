"use client";

import { useEffect } from "react";
import { trackProductEvent } from "@/lib/analytics";

export default function TrackView({ track }: { track: string }) {
  useEffect(() => {
    trackProductEvent("track_view", { track });
  }, [track]);

  return null;
}
