import { getTracks, getLessons } from "@/lib/content";
import type { Progress } from "@/lib/progress-types";

export type RecommendedLesson = {
  trackSlug: string;
  trackTitle: string;
  trackIcon: string;
  lessonSlug: string;
  lessonTitle: string;
  reason: string;
};

export async function getRecommendedLessons(progress: Progress): Promise<RecommendedLesson[]> {
  const tracks = await getTracks();
  const result: RecommendedLesson[] = [];

  for (const track of tracks) {
    const completed = progress.completedLessons[track.slug] ?? [];
    const lessons = await getLessons(track.slug);
    const nextLesson = lessons.find((l) => !completed.includes(l.slug));
    if (nextLesson && completed.length > 0) {
      result.push({
        trackSlug: track.slug,
        trackTitle: track.title,
        trackIcon: track.icon,
        lessonSlug: nextLesson.slug,
        lessonTitle: nextLesson.title,
        reason: `${Math.round((completed.length / lessons.length) * 100)}% مكتمل`,
      });
    }
    if (result.length >= 5) break;
  }

  return result;
}
