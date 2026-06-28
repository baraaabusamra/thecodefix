"use client";

import { useState } from "react";
import Link from "next/link";
import type { Quiz } from "@/lib/quiz";
import { recordQuiz, PASS_RATIO } from "@/lib/progress";

export default function QuizRunner({
  track,
  trackTitle,
  quiz,
}: {
  track: string;
  trackTitle: string;
  quiz: Quiz;
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

  function submit() {
    setSubmitted(true);
    recordQuiz(track, score, total);
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
                        onChange={() =>
                          setAnswers((a) => ({ ...a, [i]: oi }))
                        }
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
