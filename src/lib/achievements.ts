// Derives achievement badges from the learner's progress (pure, no I/O).
// Used by the account dashboard and the lesson celebration toast.

import { PASS_RATIO, type Progress } from "@/lib/progress-types";

export type Badge = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  earned: boolean;
  current: number;
  goal: number;
};

export function progressTotals(p: Progress) {
  const totalLessons = Object.values(p.completedLessons).reduce(
    (n, arr) => n + arr.length,
    0
  );
  const tracksStarted = Object.values(p.completedLessons).filter(
    (arr) => arr.length > 0
  ).length;
  const quizzesPassed = Object.values(p.quizzes).filter(
    (q) => q.total > 0 && q.score / q.total >= PASS_RATIO
  ).length;
  return { totalLessons, tracksStarted, quizzesPassed };
}

export function computeAchievements(p: Progress): Badge[] {
  const { totalLessons, tracksStarted, quizzesPassed } = progressTotals(p);

  const defs: Omit<Badge, "earned">[] = [
    { id: "first-lesson", icon: "🌱", title: "أول خطوة", desc: "أكمل أوّل درس", current: totalLessons, goal: 1 },
    { id: "ten-lessons", icon: "📚", title: "متعلّم نشط", desc: "أكمل 10 دروس", current: totalLessons, goal: 10 },
    { id: "25-lessons", icon: "🔥", title: "مجتهد", desc: "أكمل 25 درسًا", current: totalLessons, goal: 25 },
    { id: "50-lessons", icon: "🚀", title: "منطلق", desc: "أكمل 50 درسًا", current: totalLessons, goal: 50 },
    { id: "100-lessons", icon: "🎓", title: "خبير", desc: "أكمل 100 درس", current: totalLessons, goal: 100 },
    { id: "first-quiz", icon: "🧠", title: "أول اختبار", desc: "اجتز أوّل اختبار", current: quizzesPassed, goal: 1 },
    { id: "three-quiz", icon: "🏆", title: "جامع الشهادات", desc: "اجتز 3 اختبارات", current: quizzesPassed, goal: 3 },
    { id: "ten-quiz", icon: "👑", title: "بطل الاختبارات", desc: "اجتز 10 اختبارات", current: quizzesPassed, goal: 10 },
    { id: "explorer", icon: "🧭", title: "مستكشف", desc: "ابدأ 3 مسارات", current: tracksStarted, goal: 3 },
    { id: "polymath", icon: "🌍", title: "متعدّد المجالات", desc: "ابدأ 8 مسارات", current: tracksStarted, goal: 8 },
  ];

  return defs.map((d) => ({ ...d, earned: d.current >= d.goal }));
}
