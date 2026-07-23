"use client";

import { useState } from "react";

type QItem = {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explain: string;
  difficulty: number;
  order: number;
};

export function QuestionList({
  track,
  questions,
  saveQuestion,
  deleteQuestion,
}: {
  track: string;
  questions: QItem[];
  saveQuestion: (formData: FormData) => Promise<void>;
  deleteQuestion: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الأسئلة ({questions.length})</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + سؤال جديد
        </button>
      </div>

      {editing === "new" && (
        <QuestionForm
          track={track}
          saveQuestion={saveQuestion}
          onClose={() => setEditing(null)}
        />
      )}

      {questions.map((q) => (
        <div
          key={q.id}
          className="rounded-xl border border-border bg-surface p-4"
        >
          {editing === q.id ? (
            <QuestionForm
              track={track}
              question={q}
              saveQuestion={saveQuestion}
              onClose={() => setEditing(null)}
            />
          ) : (
            <>
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs text-muted">#{q.order}</span>
                  <p className="mt-1 font-medium">{q.question}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditing(q.id)}
                    className="rounded-lg border border-border px-3 py-1 text-xs transition hover:bg-surface-2"
                  >
                    تعديل
                  </button>
                  <form action={deleteQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="track" value={track} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                    >
                      حذف
                    </button>
                  </form>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt, i) => (
                  <span
                    key={i}
                    className={`rounded-lg px-2.5 py-1 text-xs ${
                      i === q.answer
                        ? "bg-green-500/20 text-green-400"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    {i === q.answer && "✓ "}{opt}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{q.explain}</p>
              <span className="mt-1 inline-block rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                صعوبة: {q.difficulty}/5
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function QuestionForm({
  track,
  question,
  saveQuestion,
  onClose,
}: {
  track: string;
  question?: QItem;
  saveQuestion: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <form action={saveQuestion} className="rounded-xl border border-accent/30 bg-surface p-4 space-y-3">
      {question && <input type="hidden" name="id" value={question.id} />}
      <input type="hidden" name="track" value={track} />

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">السؤال</label>
        <input
          name="question"
          defaultValue={question?.question ?? ""}
          required
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <label className="block text-xs font-semibold text-muted mb-1">
              خيار {i + 1} {question?.answer === i ? "(الصحيح)" : ""}
            </label>
            <input
              name={`opt${i}`}
              defaultValue={question?.options[i] ?? ""}
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">الإجابة الصحيحة (0-3)</label>
          <input
            name="answer"
            type="number"
            min={0}
            max={3}
            defaultValue={question?.answer ?? 0}
            required
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">الصعوبة (1-5)</label>
          <input
            name="difficulty"
            type="number"
            min={1}
            max={5}
            defaultValue={question?.difficulty ?? 1}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">الترتيب</label>
          <input
            name="order"
            type="number"
            min={0}
            defaultValue={question?.order ?? 0}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">الشرح</label>
        <textarea
          name="explain"
          defaultValue={question?.explain ?? ""}
          required
          rows={2}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {question ? "حفظ التغييرات" : "إضافة السؤال"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-2"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
