import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../../_components/gates";
import { getUniversity, getSpecialization } from "@/lib/academic-universities";
import { getStudyPlan, getDbStudyPlanByKey } from "@/lib/academic-study-plans";
import { saveStudyPlan, deleteStudyPlan } from "../actions";
import StudyPlanEditor from "../StudyPlanEditor";

export const metadata: Metadata = {
  title: "تحرير خطة دراسية",
  robots: { index: false, follow: false },
};

export default async function EditStudyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{
    country?: string;
    university?: string;
    specialization?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) return <Forbidden role={access.role} />;

  const { country, university, specialization, saved, error } = await searchParams;
  if (!country || !university || !specialization) notFound();

  const u = getUniversity(country, university);
  const spec = getSpecialization(specialization);
  if (!u || !spec || !u.specializations.includes(specialization)) notFound();

  const plan = await getStudyPlan(country, university, specialization);
  const dbRow = await getDbStudyPlanByKey(country, university, specialization);

  return (
    <div>
      <nav className="mb-4 text-sm text-muted">
        <Link href="/admin/academic" className="hover:text-foreground">
          الجانب الأكاديمي
        </Link>
        {" / "}
        {u.name} / {spec.title}
      </nav>

      <h1 className="text-2xl font-bold">
        {u.name} — {spec.title}
      </h1>

      {saved && (
        <p className="mt-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          ✓ تم الحفظ.
        </p>
      )}
      {error === "json" && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          ✗ صار خطأ بحفظ الأقسام والمواد، جرّب مرة ثانية.
        </p>
      )}

      {plan?.origin === "file" ? (
        <p className="mt-4 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-muted">
          ⚠️ هاي الخطة موثّقة من ملف داخل الكود (مصدر:{" "}
          <span className="font-semibold text-foreground">{plan.source}</span>
          ), مو من لوحة الإدارة — فهي للعرض فقط من هون. أي تعديل عليها لازم
          يصير بالكود مباشرة.
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted">
          {dbRow ? "عدّل الخطة الموجودة." : "لسا ما في خطة — عبّي الحقول تحت لإنشائها."}{" "}
          تظهر التعديلات على الموقع فور الحفظ.
        </p>
      )}

      <div className="mt-6">
        {plan?.origin === "file" ? (
          <StudyPlanReadOnly plan={plan} />
        ) : (
          <StudyPlanEditor
            country={country}
            university={university}
            specialization={specialization}
            specTitle={spec.title}
            universityName={u.name}
            dbId={dbRow?.id}
            initial={{
              programNameEn: plan?.programNameEn ?? "",
              degree: plan?.degree ?? "بكالوريوس",
              totalCreditHours: plan?.totalCreditHours ?? 0,
              source: plan?.source ?? "",
              sourceDate: plan?.sourceDate ?? "",
              generalNote: plan?.generalNote,
              categories: plan?.categories ?? [],
            }}
            saveAction={saveStudyPlan}
            deleteAction={deleteStudyPlan}
          />
        )}
      </div>
    </div>
  );
}

function StudyPlanReadOnly({
  plan,
}: {
  plan: NonNullable<Awaited<ReturnType<typeof getStudyPlan>>>;
}) {
  return (
    <div className="space-y-4">
      {plan.categories.map((cat) => (
        <div key={cat.name} className="rounded-xl border border-border bg-surface/30 p-4">
          <h3 className="font-semibold">
            {cat.name}{" "}
            <span className="font-normal text-muted">({cat.creditHours} ساعة)</span>
          </h3>
          <p className="mt-1 text-xs text-muted">{cat.courses.length} مادة</p>
        </div>
      ))}
    </div>
  );
}
