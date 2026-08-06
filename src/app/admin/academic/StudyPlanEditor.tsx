"use client";

import { useState } from "react";
import type { StudyPlanCategory, StudyPlanCourse } from "@/lib/academic-study-plans";

type Props = {
  country: string;
  university: string;
  specialization: string;
  specTitle: string;
  universityName: string;
  initial: {
    programNameEn: string;
    degree: string;
    totalCreditHours: number;
    source: string;
    sourceDate: string;
    generalNote?: string;
    categories: StudyPlanCategory[];
  };
  dbId?: string;
  saveAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
};

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-brand-purple";

function emptyCourse(): StudyPlanCourse {
  return { number: "", name: "", creditHours: 3, theoretical: 3, practical: 0 };
}

function emptyCategory(): StudyPlanCategory {
  return { name: "", creditHours: 0, courses: [] };
}

export default function StudyPlanEditor({
  country,
  university,
  specialization,
  specTitle,
  universityName,
  initial,
  dbId,
  saveAction,
  deleteAction,
}: Props) {
  const [programNameEn, setProgramNameEn] = useState(initial.programNameEn);
  const [degree, setDegree] = useState(initial.degree || "بكالوريوس");
  const [totalCreditHours, setTotalCreditHours] = useState(initial.totalCreditHours);
  const [source, setSource] = useState(initial.source);
  const [sourceDate, setSourceDate] = useState(initial.sourceDate);
  const [generalNote, setGeneralNote] = useState(initial.generalNote ?? "");
  const [categories, setCategories] = useState<StudyPlanCategory[]>(
    initial.categories.length ? initial.categories : [emptyCategory()]
  );

  function updateCategory(ci: number, patch: Partial<StudyPlanCategory>) {
    setCategories((cats) => cats.map((c, i) => (i === ci ? { ...c, ...patch } : c)));
  }
  function removeCategory(ci: number) {
    setCategories((cats) => cats.filter((_, i) => i !== ci));
  }
  function addCategory() {
    setCategories((cats) => [...cats, emptyCategory()]);
  }
  function updateCourse(ci: number, coi: number, patch: Partial<StudyPlanCourse>) {
    setCategories((cats) =>
      cats.map((c, i) =>
        i === ci
          ? { ...c, courses: c.courses.map((co, j) => (j === coi ? { ...co, ...patch } : co)) }
          : c
      )
    );
  }
  function removeCourse(ci: number, coi: number) {
    setCategories((cats) =>
      cats.map((c, i) => (i === ci ? { ...c, courses: c.courses.filter((_, j) => j !== coi) } : c))
    );
  }
  function addCourse(ci: number) {
    setCategories((cats) =>
      cats.map((c, i) => (i === ci ? { ...c, courses: [...c.courses, emptyCourse()] } : c))
    );
  }

  const courseCount = categories.reduce((n, c) => n + c.courses.length, 0);

  return (
    <form action={saveAction} className="space-y-6">
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="university" value={university} />
      <input type="hidden" name="specialization" value={specialization} />
      <input type="hidden" name="categoriesJson" value={JSON.stringify(categories)} />

      <div className="rounded-xl border border-border bg-surface/50 p-4">
        <p className="text-xs text-muted">
          {universityName} — {specTitle}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="اسم البرنامج الرسمي (إنجليزي)">
            <input
              className={inputCls}
              dir="ltr"
              value={programNameEn}
              onChange={(e) => setProgramNameEn(e.target.value)}
              placeholder="Computer Science And Application (CSA)"
            />
          </Field>
          <Field label="الدرجة العلمية">
            <input
              className={inputCls}
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder="بكالوريوس"
            />
          </Field>
          <Field label="إجمالي الساعات المعتمدة">
            <input
              type="number"
              className={inputCls}
              value={totalCreditHours}
              onChange={(e) => setTotalCreditHours(Number(e.target.value) || 0)}
              name="totalCreditHours"
            />
          </Field>
          <Field label="المصدر">
            <input
              className={inputCls}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              name="source"
              placeholder="دائرة القبول والتسجيل — اسم الجامعة"
            />
          </Field>
          <Field label="تاريخ المصدر">
            <input
              type="date"
              className={inputCls}
              value={sourceDate}
              onChange={(e) => setSourceDate(e.target.value)}
              name="sourceDate"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="ملاحظة عامة (اختياري)">
              <input
                className={inputCls}
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                name="generalNote"
                placeholder="مثلاً: مواد ممكن تُستبدل بمادة حرة من كلية أخرى..."
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">
          الأقسام والمواد{" "}
          <span className="text-sm font-normal text-muted">
            ({categories.length} قسم، {courseCount} مادة)
          </span>
        </h2>
        <button
          type="button"
          onClick={addCategory}
          className="rounded-lg border border-brand-purple/50 px-3 py-1.5 text-xs font-semibold text-brand-purple transition hover:bg-brand-purple/10"
        >
          ＋ قسم جديد
        </button>
      </div>

      <div className="space-y-4">
        {categories.map((cat, ci) => (
          <div key={ci} className="rounded-xl border border-border bg-surface/30 p-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1">
                <Field label="اسم القسم" compact>
                  <input
                    className={inputCls}
                    value={cat.name}
                    onChange={(e) => updateCategory(ci, { name: e.target.value })}
                    placeholder="متطلبات الجامعة الإجبارية"
                  />
                </Field>
              </div>
              <div className="w-32">
                <Field label="الساعات" compact>
                  <input
                    type="number"
                    className={inputCls}
                    value={cat.creditHours}
                    onChange={(e) =>
                      updateCategory(ci, { creditHours: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => removeCategory(ci)}
                className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
              >
                🗑️ حذف القسم
              </button>
            </div>
            <div className="mt-2">
              <Field label="ملاحظة على القسم (اختياري)" compact>
                <input
                  className={inputCls}
                  value={cat.note ?? ""}
                  onChange={(e) => updateCategory(ci, { note: e.target.value })}
                  placeholder="مثلاً: يختار الطالب 9 ساعات من هذه القائمة"
                />
              </Field>
            </div>

            {cat.courses.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-surface text-muted">
                    <tr>
                      <th className="px-2 py-1.5 text-start">رقم المادة</th>
                      <th className="px-2 py-1.5 text-start">اسم المادة</th>
                      <th className="px-2 py-1.5 text-start">الساعات</th>
                      <th className="px-2 py-1.5 text-start">نظري</th>
                      <th className="px-2 py-1.5 text-start">عملي</th>
                      <th className="px-2 py-1.5 text-start">المتطلب السابق</th>
                      <th className="px-2 py-1.5 text-start">النمط</th>
                      <th className="px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {cat.courses.map((c, coi) => (
                      <tr key={coi} className="border-t border-border">
                        <td className="p-1">
                          <input
                            className={inputCls}
                            dir="ltr"
                            value={c.number}
                            onChange={(e) => updateCourse(ci, coi, { number: e.target.value })}
                          />
                        </td>
                        <td className="min-w-40 p-1">
                          <input
                            className={inputCls}
                            dir="ltr"
                            value={c.name}
                            onChange={(e) => updateCourse(ci, coi, { name: e.target.value })}
                          />
                        </td>
                        <td className="w-16 p-1">
                          <input
                            type="number"
                            className={inputCls}
                            value={c.creditHours}
                            onChange={(e) =>
                              updateCourse(ci, coi, { creditHours: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="w-16 p-1">
                          <input
                            type="number"
                            className={inputCls}
                            value={c.theoretical}
                            onChange={(e) =>
                              updateCourse(ci, coi, { theoretical: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="w-16 p-1">
                          <input
                            type="number"
                            className={inputCls}
                            value={c.practical}
                            onChange={(e) =>
                              updateCourse(ci, coi, { practical: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <input
                            className={inputCls}
                            dir="ltr"
                            value={c.prerequisite ?? ""}
                            onChange={(e) =>
                              updateCourse(ci, coi, { prerequisite: e.target.value })
                            }
                          />
                        </td>
                        <td className="w-24 p-1">
                          <input
                            className={inputCls}
                            value={c.mode ?? ""}
                            onChange={(e) => updateCourse(ci, coi, { mode: e.target.value })}
                            placeholder="حضوري"
                          />
                        </td>
                        <td className="p-1">
                          <button
                            type="button"
                            onClick={() => removeCourse(ci, coi)}
                            className="rounded px-2 py-1 text-red-500 hover:bg-red-500/10"
                            title="حذف المادة"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              type="button"
              onClick={() => addCourse(ci)}
              className="mt-2 rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
            >
              ＋ مادة
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          type="submit"
          className="rounded-lg bg-brand-purple px-5 py-2 font-semibold text-white transition hover:opacity-90"
        >
          💾 حفظ الخطة
        </button>
        {dbId && (
          <button
            type="submit"
            formAction={deleteAction}
            name="id"
            value={dbId}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
            onClick={(e) => {
              if (!confirm("متأكد إنك بدك تحذف هالخطة نهائيًا؟")) e.preventDefault();
            }}
          >
            حذف الخطة نهائيًا
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  compact,
  children,
}: {
  label: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={compact ? "" : ""}>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      {children}
    </div>
  );
}
