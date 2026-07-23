import type { Progress } from "./progress-types";
import { PASS_RATIO } from "./progress-types";

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  earned: boolean;
  current: number;
  goal: number;
};

export function computeAchievements(progress: Progress): Achievement[] {
  const completed = Object.values(progress.completedLessons ?? {});
  const totalLessons = completed.reduce((n, l) => n + l.length, 0);
  const passedQuizzes = Object.values(progress.quizzes ?? {}).filter(
    (r) => r.score / r.total >= PASS_RATIO,
  ).length;
  const finishedTrackCount = Object.values(progress.completedLessons ?? {}).filter(
    (lessons) => lessons.length >= 10,
  ).length;

  return [
    {
      id: "first-lesson",
      title: "البداية",
      desc: "أكمل أول درس",
      icon: "🎯",
      earned: totalLessons >= 1,
      current: totalLessons,
      goal: 1,
    },
    {
      id: "ten-lessons",
      title: "متعلّم جاد",
      desc: "أكمل ١٠ دروس",
      icon: "📚",
      earned: totalLessons >= 10,
      current: totalLessons,
      goal: 10,
    },
    {
      id: "fifty-lessons",
      title: "طالب مجتهد",
      desc: "أكمل ٥٠ درس",
      icon: "⭐",
      earned: totalLessons >= 50,
      current: totalLessons,
      goal: 50,
    },
    {
      id: "first-quiz",
      title: "اختبار ناجح",
      desc: "اجتاز أول اختبار",
      icon: "✅",
      earned: passedQuizzes >= 1,
      current: passedQuizzes,
      goal: 1,
    },
    {
      id: "five-quizzes",
      title: "مختبر محترف",
      desc: "اجتاز ٥ اختبارات",
      icon: "🏆",
      earned: passedQuizzes >= 5,
      current: passedQuizzes,
      goal: 5,
    },
    {
      id: "first-track",
      title: "مُتمٍّ",
      desc: "أكمل أول مسار كامل",
      icon: "🎓",
      earned: finishedTrackCount >= 1,
      current: finishedTrackCount,
      goal: 1,
    },
  ];
}

// ── Streaks ───────────────────────────────────────────────────────────

export function computeStreak(activeDates: string[]): {
  current: number;
  longest: number;
} {
  if (activeDates.length === 0) return { current: 0, longest: 0 };

  const dates = [...new Set(activeDates)].sort().reverse();
  let current = 1;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (dates[0] !== today && dates[0] !== yesterday) current = 0;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) current++;
    else break;
  }

  let longest = current;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  return { current, longest };
}
