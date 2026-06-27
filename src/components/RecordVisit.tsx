"use client";

import { useEffect } from "react";
import { recordRecent, type RecentLesson } from "@/lib/recent";

// Invisible: records the current lesson as the most-recently-viewed.
export default function RecordVisit(props: RecentLesson) {
  useEffect(() => {
    recordRecent(props);
  }, [props]);
  return null;
}
