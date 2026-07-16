"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getMyProgress, saveMyProgress } from "@/app/progress-actions";
import { hydrateProgress, readProgress } from "@/lib/progress";

// On sign-in, pull the user's progress from the database into the local cache
// (so it syncs across devices). If the account has no saved progress yet, seed
// it from whatever is in this browser (one-time migration from localStorage).
export default function ProgressSync() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    getMyProgress()
      .then((server) => {
        if (cancelled) return;
        if (server) {
          hydrateProgress(server); // DB is the source of truth
        } else {
          const local = readProgress();
          const hasLocal =
            !!local.name ||
            Object.keys(local.completedLessons).length > 0 ||
            Object.keys(local.quizzes).length > 0;
          if (hasLocal) saveMyProgress(local).catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
