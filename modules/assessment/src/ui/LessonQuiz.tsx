"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { markSignupStarted, trackProductEvent } from "@tcf/observability/analytics";
import {
  startLessonQuiz,
  submitLessonQuiz,
  type SubmitLessonQuizResult,
} from "../actions/lesson-quiz";
import type { SanitizedQuestion } from "../quiz-bank";

// Quiz for one required lesson. Fully server-graded: this component never
// knows a correct answer until the server sends back graded results after
// submit — there is no `answer` field anywhere in its state before that.

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "in_progress"; attemptId: string; questions: SanitizedQuestion[] }
  | { phase: "graded"; result: Extract<SubmitLessonQuizResult, { ok: true }> }
  | { phase: "error"; message: string };

export default function LessonQuiz({
  track,
  lesson,
  lessonTitle,
}: {
  track: string;
  lesson: string;
  lessonTitle: string;
}) {
  const { status: sessionStatus } = useSession();
  const [state, setState] = useState<State>({ phase: "idle" });
  const [answers, setAnswers] = useState<Record<string, number>>({});

  if (sessionStatus === "loading") return null;

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="mt-10 rounded-2xl border border-brand-purple/40 bg-brand-purple/10 p-6 text-center">
        <p className="mb-3 font-semibold leading-relaxed">
          سجّل دخولك لفتح اختبار هذا الدرس وحفظ تقدّمك نحو شهادة {track.toUpperCase()}.
        </p>
        <button
          onClick={() => {
            markSignupStarted("lesson_quiz");
            void signIn();
          }}
          className="btn-neon px-6 py-2 text-sm"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  async function begin() {
    setState({ phase: "loading" });
    const res = await startLessonQuiz(track, lesson);
    if (!res.ok) {
      const messages: Record<string, string> = {
        unauthenticated: "سجّل الدخول لحفظ تقدّمك وإكمال هذا الاختبار.",
        unavailable: "الاختبار غير متاح حاليًا لهذا الدرس.",
        rate_limited: "محاولات كثيرة خلال وقت قصير — أعد المحاولة بعد قليل.",
      };
      setState({ phase: "error", message: messages[res.reason] ?? "تعذّر بدء الاختبار." });
      return;
    }
    setAnswers({});
    setState({ phase: "in_progress", attemptId: res.attemptId, questions: res.questions });
    trackProductEvent("quiz_start", { track, lesson });
  }

  async function submit() {
    if (state.phase !== "in_progress") return;
    const { attemptId } = state;
    setState({ phase: "loading" });
    const res = await submitLessonQuiz(attemptId, answers);
    if (!res.ok) {
      setState({ phase: "error", message: "تعذّر تسليم الإجابات — أعد المحاولة." });
      return;
    }
    if (res.passed) {
      trackProductEvent("quiz_pass", {
        track,
        lesson,
        score: res.score,
        total: res.total,
      });
    }
    setState({ phase: "graded", result: res });
  }

  return (
    <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-1 text-xl font-bold">✅ اختبار الدرس</h2>
      <p className="mb-4 text-sm text-muted">
        5 أسئلة عن «{lessonTitle}» — تحتاج 4 إجابات صحيحة على الأقل للنجاح.
      </p>

      {state.phase === "idle" && (
        <button onClick={begin} className="btn-neon px-6 py-3">
          ابدأ اختبار الدرس
        </button>
      )}

      {state.phase === "loading" && <p className="text-muted">جارٍ التحميل…</p>}

      {state.phase === "error" && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
          {state.message}
        </div>
      )}

      {state.phase === "in_progress" && (
        <QuizForm
          questions={state.questions}
          answers={answers}
          onAnswer={(qid, i) => setAnswers((a) => ({ ...a, [qid]: i }))}
          onSubmit={submit}
        />
      )}

      {state.phase === "graded" && (
        <GradedView
          result={state.result}
          onRetry={() => {
            setAnswers({});
            setState({ phase: "idle" });
          }}
        />
      )}
    </div>
  );
}

function QuizForm({
  questions,
  answers,
  onAnswer,
  onSubmit,
}: {
  questions: SanitizedQuestion[];
  answers: Record<string, number>;
  onAnswer: (questionId: string, index: number) => void;
  onSubmit: () => void;
}) {
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  return (
    <div className="space-y-5">
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-xl border border-border p-4">
          <p className="mb-3 font-semibold">
            {qi + 1}. {q.q}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label
                key={oi}
                className={`block cursor-pointer rounded-lg border px-4 py-2 text-start transition ${
                  answers[q.id] === oi
                    ? "border-brand-purple bg-brand-purple/10"
                    : "border-border hover:border-brand-purple/50"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  className="me-2"
                  checked={answers[q.id] === oi}
                  onChange={() => onAnswer(q.id, oi)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={onSubmit}
        disabled={!allAnswered}
        className="btn-neon w-full px-6 py-3 disabled:opacity-50"
      >
        {allAnswered ? "تسليم الإجابات" : "أجب عن كل الأسئلة أولًا"}
      </button>
    </div>
  );
}

function GradedView({
  result,
  onRetry,
}: {
  result: Extract<SubmitLessonQuizResult, { ok: true }>;
  onRetry: () => void;
}) {
  return (
    <div>
      <div
        className={`mb-5 rounded-xl border p-5 text-center ${
          result.passed ? "border-brand-cyan neon-glow" : "border-border"
        }`}
      >
        <p className="text-2xl font-bold">
          نتيجتك: {result.score} / {result.total}
        </p>
        <p className="mt-1 text-muted">
          {result.passed ? "🎉 اجتزت اختبار الدرس!" : "لم تجتز هذه المرة — راجع الدرس وحاول مجددًا."}
        </p>
      </div>
      <div className="space-y-3">
        {result.results.map((r, i) => (
          <div
            key={r.id}
            className={`rounded-lg border p-3 text-sm ${
              r.correct ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"
            }`}
          >
            <p className="mb-1 font-semibold">
              {i + 1}. {r.q}
            </p>
            <p className="text-muted">
              {r.correct ? "✅ إجابة صحيحة" : `❌ الإجابة الصحيحة: ${r.options[r.correctIndex]}`}
            </p>
            <p className="mt-1 text-muted">💡 {r.explain}</p>
          </div>
        ))}
      </div>
      <button
        onClick={onRetry}
        className="mt-5 w-full rounded-lg border border-border px-4 py-2 text-sm hover:text-foreground"
      >
        ↺ إعادة المحاولة
      </button>
    </div>
  );
}
