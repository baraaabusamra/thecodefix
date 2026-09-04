"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { track as trackEvent } from "@vercel/analytics/react";
import {
  startOrResumeExam,
  saveExamAnswer,
  submitExam,
  type SubmitExamResult,
} from "@/app/quiz/[tech]/exam-actions";
import type { SanitizedQuestion } from "@/lib/quiz-bank";

// The final exam for tracks with a real question bank (currently: html).
// Every grading decision happens on the server (src/app/quiz/[tech]/exam-actions.ts,
// src/lib/quiz-bank.ts) — this component only displays state and relays intent
// (answer X, submit now). The countdown shown here is a courtesy UI only; the
// server independently enforces the real deadline via `expiresAt`.

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "not_eligible"; missing: string[] }
  | { phase: "locked_out"; retryAfter: string }
  | { phase: "in_progress"; attemptId: string; questions: SanitizedQuestion[]; expiresAt: string }
  | { phase: "graded"; result: Extract<SubmitExamResult, { ok: true }> }
  | { phase: "error"; message: string };

export default function ExamRunner({ track, trackTitle }: { track: string; trackTitle: string }) {
  const { status: sessionStatus } = useSession();
  const [state, setState] = useState<State>({ phase: "idle" });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState<number>(0);
  const submittingRef = useRef(false);

  const begin = useCallback(async () => {
    setState({ phase: "loading" });
    const res = await startOrResumeExam(track);
    if (!res.ok) {
      if (res.reason === "missing_lessons") {
        setState({ phase: "not_eligible", missing: res.missing });
      } else if (res.reason === "too_many_failed_attempts") {
        setState({ phase: "locked_out", retryAfter: res.retryAfter });
      } else {
        const messages: Record<string, string> = {
          unauthenticated: "سجّل الدخول لبدء الاختبار النهائي.",
          unavailable: "الاختبار النهائي غير متاح حاليًا.",
          rate_limited: "محاولات كثيرة خلال وقت قصير — أعد المحاولة بعد قليل.",
        };
        setState({ phase: "error", message: messages[res.reason] ?? "تعذّر بدء الاختبار." });
      }
      return;
    }
    setAnswers(res.answers);
    setState({ phase: "in_progress", attemptId: res.attemptId, questions: res.questions, expiresAt: res.expiresAt });
    trackEvent("exam_started", { track });
  }, [track]);

  const doSubmit = useCallback(async () => {
    if (state.phase !== "in_progress" || submittingRef.current) return;
    submittingRef.current = true;
    const { attemptId } = state;
    setState({ phase: "loading" });
    const res = await submitExam(attemptId);
    submittingRef.current = false;
    if (!res.ok) {
      setState({ phase: "error", message: "تعذّر تسليم الاختبار — أعد المحاولة." });
      return;
    }
    trackEvent(res.passed ? "exam_passed" : "exam_failed", { track, score: res.score, total: res.total });
    setState({ phase: "graded", result: res });
  }, [state, track]);

  // Countdown display + auto-submit at zero (server will grade whatever was
  // autosaved regardless — this just gives a clean UX instead of a stuck timer).
  useEffect(() => {
    if (state.phase !== "in_progress") return;
    const tick = () => {
      const ms = new Date(state.expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
      if (ms <= 0) doSubmit();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state, doSubmit]);

  async function onAnswer(questionId: string, index: number) {
    setAnswers((a) => ({ ...a, [questionId]: index }));
    if (state.phase === "in_progress") {
      saveExamAnswer(state.attemptId, questionId, index).catch(() => {});
    }
  }

  if (sessionStatus === "loading") return null;

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="mb-4 text-lg font-semibold">سجّل دخولك لبدء الاختبار النهائي لمسار {trackTitle}.</p>
        <button onClick={() => signIn()} className="btn-neon px-6 py-3">
          تسجيل الدخول
        </button>
      </div>
    );
  }

  if (state.phase === "idle") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-2 text-muted">40 سؤالًا، 50 دقيقة، تحتاج 32/40 للنجاح.</p>
        <button onClick={begin} className="btn-neon px-8 py-3">
          ابدأ الاختبار النهائي
        </button>
      </div>
    );
  }

  if (state.phase === "loading") {
    return <p className="py-16 text-center text-muted">جارٍ التحميل…</p>;
  }

  if (state.phase === "not_eligible") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h2 className="mb-3 text-xl font-bold">🔒 أكمل الدروس المطلوبة أولًا</h2>
        <p className="mb-4 text-muted">
          يجب اجتياز اختبار كل درس أساسي قبل فتح الاختبار النهائي. الدروس المتبقية:
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {state.missing.map((slug) => (
            <li key={slug}>
              <Link href={`/learn/${track}/${slug}`} className="text-brand-cyan hover:underline">
                {slug}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (state.phase === "locked_out") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-lg font-semibold">وصلت للحد الأقصى من المحاولات الفاشلة (3) خلال 24 ساعة.</p>
        <p className="mt-2 text-muted">
          يمكنك إعادة المحاولة بعد{" "}
          {new Date(state.retryAfter).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}.
        </p>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-red-500">{state.message}</div>
    );
  }

  if (state.phase === "graded") {
    const { result } = state;
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className={`mb-8 rounded-2xl border p-6 text-center ${result.passed ? "border-brand-cyan neon-glow" : "border-border"}`}>
          <p className="text-2xl font-bold">نتيجتك: {result.score} / {result.total}</p>
          <p className="mt-2 text-muted">
            {result.passed ? "🎉 مبروك! اجتزت الاختبار النهائي." : "لم تجتز هذه المرة — راجع الدروس وحاول لاحقًا."}
          </p>
          {result.passed && (
            <Link href={`/certificate/${track}`} className="btn-neon mt-4 inline-block px-6 py-3">
              🏆 استلم شهادتك
            </Link>
          )}
        </div>
        <div className="space-y-3">
          {result.results.map((r, i) => (
            <div key={r.id} className={`rounded-lg border p-3 text-sm ${r.correct ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}>
              <p className="mb-1 font-semibold">{i + 1}. {r.q}</p>
              <p className="text-muted">{r.correct ? "✅ صحيحة" : `❌ الصحيحة: ${r.options[r.correctIndex]}`}</p>
              <p className="mt-1 text-muted">💡 {r.explain}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // in_progress
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const allAnswered = state.questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="sticky top-16 z-10 mb-6 flex items-center justify-between rounded-full border border-border bg-surface/95 px-4 py-2 text-sm backdrop-blur">
        <span className="font-semibold">{Object.keys(answers).length} / {state.questions.length}</span>
        <span dir="ltr" className={`font-mono font-bold ${remaining < 300 ? "text-red-500" : ""}`}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="space-y-5">
        {state.questions.map((q, qi) => (
          <div key={q.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 font-semibold">{qi + 1}. {q.q}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className={`block cursor-pointer rounded-lg border px-4 py-2 text-start transition ${
                    answers[q.id] === oi ? "border-brand-purple bg-brand-purple/10" : "border-border hover:border-brand-purple/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`exam-${q.id}`}
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
      </div>
      <button onClick={doSubmit} disabled={!allAnswered} className="btn-neon mt-8 w-full px-6 py-3 disabled:opacity-50">
        {allAnswered ? "تسليم الاختبار" : `أجب عن كل الأسئلة (${Object.keys(answers).length}/${state.questions.length})`}
      </button>
    </div>
  );
}
