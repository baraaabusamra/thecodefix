import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getTrack } from "@/lib/content";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { requireDb } from "@/db";
import { quizQuestions } from "@/db/schema";
import { Forbidden } from "../../../_components/gates";
import { QuestionList } from "./questions-client";
import { saveQuestion, deleteQuestion } from "../../actions";

export const metadata: Metadata = {
  title: "إدارة أسئلة الاختبار",
  robots: { index: false, follow: false },
};

export default async function DbQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ track: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) return <Forbidden role={access.role} />;

  const { track } = await params;
  const { saved } = await searchParams;
  const db = requireDb();
  const trackMeta = await getTrack(track);
  if (!trackMeta) notFound();

  const rows = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.track, track))
    .orderBy(asc(quizQuestions.order));

  const questions = rows.map((r) => ({
    id: r.id,
    question: r.question,
    options: JSON.parse(r.options) as string[],
    answer: r.answer,
    explain: r.explain,
    difficulty: r.difficulty,
    order: r.order,
  }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/quizzes" className="hover:text-foreground">الاختبارات</Link>
        <span>/</span>
        <Link href={`/admin/quizzes/${track}`} className="hover:text-foreground">{trackMeta.title}</Link>
        <span>/</span>
        <span className="text-foreground">إدارة الأسئلة</span>
      </div>

      {saved && (
        <p className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          ✓ تم حفظ التغييرات.
        </p>
      )}

      <QuestionList
        track={track}
        questions={questions}
        saveQuestion={saveQuestion}
        deleteQuestion={deleteQuestion}
      />
    </div>
  );
}
