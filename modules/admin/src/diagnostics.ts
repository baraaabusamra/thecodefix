import { getTracks, getLessons } from "@tcf/content/tracks";
import { hasQuiz, getQuiz } from "@tcf/content/quizzes";
import { hasExamBank, getExamQuestionPool } from "@tcf/assessment/quiz-bank";

// Read-only content health audit for the admin diagnostics page. Surfaces
// quality issues across every track (incomplete courses/quizzes, missing
// metadata, duplicate order numbers) without touching the filesystem.

export type TrackDiagnostic = {
  slug: string;
  title: string;
  icon: string;
  lessonCount: number;
  quizCount: number;
  missingDescription: number;
  missingKeywords: number;
  duplicateOrders: number[];
  issues: string[];
};

export type DiagnosticsReport = {
  tracks: TrackDiagnostic[];
  totalIssues: number;
  healthyTracks: number;
};

export async function runDiagnostics(): Promise<DiagnosticsReport> {
  const tracks = await getTracks();
  const rows: TrackDiagnostic[] = [];

  for (const t of tracks) {
    const lessons = await getLessons(t.slug);
    // Count both legacy and secure banks so the diagnostic accurately
    // reflects assessment coverage for secure-exam-only tracks like AI/ML.
    const legacyCount = hasQuiz(t.slug) ? getQuiz(t.slug)?.questions.length ?? 0 : 0;
    const secureCount = hasExamBank(t.slug) ? getExamQuestionPool(t.slug).length : 0;
    const quizCount = legacyCount + secureCount;

    const missingDescription = lessons.filter((l) => !l.description).length;
    const missingKeywords = lessons.filter(
      (l) => !l.keywords || l.keywords.length === 0
    ).length;

    // Duplicate order numbers
    const seen = new Map<number, number>();
    for (const l of lessons) seen.set(l.order, (seen.get(l.order) ?? 0) + 1);
    const duplicateOrders = [...seen.entries()]
      .filter(([, n]) => n > 1)
      .map(([order]) => order);

    const issues: string[] = [];
    if (lessons.length < 20) issues.push(`دروس أقل من 20 (${lessons.length})`);
    if (quizCount < 15) issues.push(`اختبار أقل من 15 سؤالًا (${quizCount})`);
    if (missingDescription > 0) issues.push(`${missingDescription} درس بلا وصف`);
    if (missingKeywords > 0) issues.push(`${missingKeywords} درس بلا كلمات مفتاحية`);
    if (duplicateOrders.length > 0)
      issues.push(`أرقام ترتيب مكرّرة: ${duplicateOrders.join(", ")}`);

    rows.push({
      slug: t.slug,
      title: t.title,
      icon: t.icon,
      lessonCount: lessons.length,
      quizCount,
      missingDescription,
      missingKeywords,
      duplicateOrders,
      issues,
    });
  }

  const totalIssues = rows.reduce((n, r) => n + r.issues.length, 0);
  const healthyTracks = rows.filter((r) => r.issues.length === 0).length;
  return { tracks: rows, totalIssues, healthyTracks };
}
