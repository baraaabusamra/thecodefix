"use client";

import { useEffect } from "react";
import { trackProductEvent } from "@tcf/observability/analytics";
import { recordRecent, type RecentLesson } from "@tcf/progress/recent";

// Invisible: records the current lesson as the most-recently-viewed.
export default function RecordVisit(props: RecentLesson) {
  const { track, slug, title, trackTitle } = props;
  useEffect(() => {
    recordRecent({ track, slug, title, trackTitle });
    trackProductEvent("lesson_start", { track, lesson: slug });
  }, [track, slug, title, trackTitle]);
  return null;
}
