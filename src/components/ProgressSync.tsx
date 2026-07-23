"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getMyProgress, saveMyProgress } from "@/app/progress-actions";
import { hydrateProgress, readProgress } from "@/lib/progress";
import { mergeProgress } from "@/lib/progress-sync";

const SYNC_INTERVAL = 60_000; // 1 minute

export default function ProgressSync() {
  const { status } = useSession();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    let cancelled = false;

    async function sync() {
      try {
        const server = await getMyProgress();
        if (cancelled) return;
        const local = readProgress();
        if (server) {
          const merged = mergeProgress(local, server);
          hydrateProgress(merged);
          if (merged.version !== local.version) saveMyProgress(merged).catch(() => {});
        } else {
          const hasLocal =
            !!local.name ||
            Object.keys(local.completedLessons).length > 0 ||
            Object.keys(local.quizzes).length > 0;
          if (hasLocal) saveMyProgress(local).catch(() => {});
        }
      } catch {
        /* offline — try again later */
      }
    }

    sync();
    intervalRef.current = setInterval(sync, SYNC_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  return null;
}
