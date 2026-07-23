"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getMyProgress, saveMyProgress } from "@/app/progress-actions";
import { hydrateProgress, mergeProgress, readProgress } from "@/lib/progress";

// On sign-in, reconcile this browser's local progress with the account's
// saved progress — merged (union of completed lessons, best score per quiz),
// never a blind overwrite in either direction, so progress made as a guest
// on this device or synced from another device is never silently discarded.
export default function ProgressSync() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    getMyProgress()
      .then((server) => {
        if (cancelled) return;
        const local = readProgress();
        if (!server) {
          const hasLocal =
            !!local.name ||
            Object.keys(local.completedLessons).length > 0 ||
            Object.keys(local.quizzes).length > 0;
          if (hasLocal) saveMyProgress(local).catch(() => {});
          return;
        }
        const merged = mergeProgress(local, server);
        hydrateProgress(merged);
        saveMyProgress(merged).catch(() => {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
