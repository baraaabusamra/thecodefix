"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { track as trackEvent } from "@vercel/analytics/react";
import type { Quiz } from "@/lib/quiz";
import { recordQuiz, PASS_RATIO } from "@/lib/progress";
import SignInToSaveCert from "./SignInToSaveCert";

export default function QuizRunner({
  track,
  trackTitle,
  quiz,
  authEnabled,
}: {
  track: string;
  trackTitle: string;
  quiz: Quiz;
  authEnabled: boolean;
}) {
  const total = quiz.questions.length;
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = quiz.questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0),
    0
  );
  const passed = score / total >= PASS_RATIO;
  const allAnswered = Object.keys(answers).length === total;

  // Fire quiz_started once, on the learner's first answer (real engagement).
  const started = useRef(false);
  function selectAnswer(qi: number, oi: number) {
    if (!started.current) {
      started.current = true;
      trackEvent("quiz_started", { track });
    }
    setAnswers((a) => ({ ...a, [qi]: oi }));
  }

  function submit() {
    setSubmitted(true);
    recordQuiz(track, score, total);
    if (passed) trackEvent("quiz_passed", { track, score, total });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  return (
    <div>
      {submitted && (
        <div
          className={`mb-8 rounded-2xl border p-6 text-center ${
            passed ? "border-brand-cyan neon-glow" : "border-border"
          }`}
        >
          <p className="text-2xl font-bold">
            نتيجتك: {score} / {total}
          </p>
          <p className="mt-2 text-muted">
            {passed
              ? "🎉 مبروك! لقد اجتزت الاختبار."
              : "لم تجتز هذه المرة — راجع الدروس وحاول مجددًا."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={reset}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:text-foreground"
            >
              ↺ إعادة المحاولة
            </button>
            {passed && (
              <Link
                href={`/certificate/${track}`}
                className="btn-neon px-4 py-2 text-sm"
              >
                🏆 استلم شهادتك
              </Link>
            )}
          </div>
          {passed && authEnabled && <SignInToSaveCert />}
        </div>
      )}

      {/* Sticky answered-count bar: with 15 questions the submit button's
          counter is off-screen most of the time, so keep progress visible
          while scrolling. top-24 clears the sticky header + subjects bar. */}
      {!submitted && (
        <div className="sticky top-24 z-10 mb-6 flex items-center gap-3 rounded-full border border-border bg-surface/95 px-4 py-2 text-sm backdrop-blur">
          <span className="whitespace-nowrap font-semibold">
            {Object.keys(answers).length} / {total}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand-purple transition-[width] duration-300"
              style={{ width: `${(Object.keys(answers).length / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-6">
        {quiz.questions.map((q, i) => {
          const selected = answers[i];
          return (
            <div key={i} className="rounded-2xl border border-border bg-surface p-5">
              <p className="mb-4 font-semibold">
                {i + 1}. {q.q}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isSelected = selected === oi;
                  const isCorrect = q.answer === oi;
                  let cls =
                    "block w-full cursor-pointer rounded-lg border px-4 py-2 text-start transition ";
                  if (submitted) {
                    if (isCorrect) cls += "border-green-500 bg-green-500/10";
                    else if (isSelected)
                      cls += "border-red-500 bg-red-500/10";
                    else cls += "border-border";
                  } else {
                    cls += isSelected
                      ? "border-brand-purple bg-brand-purple/10"
                      : "border-border hover:border-brand-purple/50";
                  }
                  return (
                    <label key={oi} className={cls}>
                      <input
                        type="radio"
                        name={`q-${i}`}
                        className="me-2"
                        disabled={submitted}
                        checked={isSelected}
                        onChange={() => selectAnswer(i, oi)}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
              {submitted && (
                <p className="mt-3 rounded-lg bg-background p-3 text-sm text-muted">
                  💡 {q.explain}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={submit}
          disabled={!allAnswered}
          className="btn-neon mt-8 w-full px-6 py-3 disabled:opacity-50"
        >
          {allAnswered
            ? "تسليم الإجابات"
            : `أجب عن كل الأسئلة (${Object.keys(answers).length}/${total})`}
        </button>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        مسار {trackTitle} — تحتاج {Math.ceil(total * PASS_RATIO)} إجابات صحيحة على الأقل للنجاح.
      </p>
    </div>
  );
}
