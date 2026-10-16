"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { requireCapability } from "@tcf/identity/authorization";
import { can } from "@tcf/identity/rbac";
import { requireDb } from "@tcf/db";
import { academicStudyPlans } from "@tcf/db/schema";
import { getUniversity, getSpecialization } from "../universities";
import type { StudyPlanCategory } from "../study-plans";

async function assertContentAccess() {
  const access = await requireCapability("content:edit");
  // Same editorial rule as CMS lessons (modules/admin/src/actions/content.ts):
  // writers draft and submit for review; content:publish makes a plan
  // public, takes it down, or changes a live plan.
  return { canPublish: can(access.role, "content:publish") };
}

const STATUSES = ["draft", "review", "published", "suspended"] as const;
type PlanStatus = (typeof STATUSES)[number];

function revalidateStudyPlan(country: string, university: string, specialization: string) {
  revalidatePath(`/academic/${country}/${university}/${specialization}`);
  revalidatePath("/admin/academic");
}

export async function saveStudyPlan(formData: FormData) {
  const { canPublish } = await assertContentAccess();
  const db = requireDb();

  const country = String(formData.get("country") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim();
  const specialization = String(formData.get("specialization") ?? "").trim();

  const u = getUniversity(country, university);
  const s = getSpecialization(specialization);
  if (!u || !s || !u.specializations.includes(specialization)) {
    redirect("/admin/academic?error=combo");
  }

  const programNameEn = String(formData.get("programNameEn") ?? "").trim();
  const degree = String(formData.get("degree") ?? "بكالوريوس").trim() || "بكالوريوس";
  const totalCreditHours = Number(formData.get("totalCreditHours")) || 0;
  const source = String(formData.get("source") ?? "").trim();
  const sourceDate = String(formData.get("sourceDate") ?? "").trim();
  const generalNote = String(formData.get("generalNote") ?? "").trim() || null;

  let categories: StudyPlanCategory[] = [];
  try {
    categories = JSON.parse(String(formData.get("categoriesJson") ?? "[]"));
    if (!Array.isArray(categories)) throw new Error("categories must be an array");
  } catch {
    redirect(
      `/admin/academic/edit?country=${country}&university=${university}&specialization=${specialization}&error=json`
    );
  }

  // Phase 3.5B-5: this is a manual content write, so pipelineCurriculumVersionId
  // must be explicitly cleared here — in BOTH the fresh-row insert and the
  // conflict update — never left as whatever it happened to be. Otherwise a
  // manual edit of a previously pipeline-published row would falsely retain
  // that row's old AI provenance even though a human just overwrote its
  // contents. NULL here is correct for a brand-new manual row too (it never
  // had pipeline provenance to begin with).
  const requested = String(formData.get("status") ?? "");
  const status: PlanStatus = canPublish
    ? (STATUSES as readonly string[]).includes(requested)
      ? (requested as PlanStatus)
      : "published"
    : formData.get("submitForReview") === "on"
      ? "review"
      : "draft";

  const [written] = await db
    .insert(academicStudyPlans)
    .values({
      country,
      university,
      specialization,
      programNameEn,
      degree,
      totalCreditHours,
      source,
      sourceDate,
      generalNote,
      categories: JSON.stringify(categories),
      pipelineCurriculumVersionId: null,
      status,
    })
    .onConflictDoUpdate({
      target: [
        academicStudyPlans.country,
        academicStudyPlans.university,
        academicStudyPlans.specialization,
      ],
      set: {
        programNameEn,
        degree,
        totalCreditHours,
        source,
        sourceDate,
        generalNote,
        categories: JSON.stringify(categories),
        pipelineCurriculumVersionId: null,
        status,
        updatedAt: new Date(),
      },
      // A writer can only overwrite an unpublished (draft/review) plan —
      // checked atomically, so a live plan can't be edited or unpublished.
      ...(canPublish
        ? {}
        : { setWhere: sql`${academicStudyPlans.status} in ('draft', 'review')` }),
    })
    .returning({ id: academicStudyPlans.id });

  if (!written) {
    redirect(
      `/admin/academic/edit?country=${country}&university=${university}&specialization=${specialization}&error=locked`
    );
  }

  revalidateStudyPlan(country, university, specialization);
  redirect(
    `/admin/academic/edit?country=${country}&university=${university}&specialization=${specialization}&saved=1`
  );
}

export async function deleteStudyPlan(formData: FormData) {
  const { canPublish } = await assertContentAccess();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");

  const [row] = await db
    .delete(academicStudyPlans)
    .where(
      canPublish
        ? eq(academicStudyPlans.id, id)
        : // Writers may only delete unpublished drafts/reviews (atomic).
          and(eq(academicStudyPlans.id, id), inArray(academicStudyPlans.status, ["draft", "review"]))
    )
    .returning({
      country: academicStudyPlans.country,
      university: academicStudyPlans.university,
      specialization: academicStudyPlans.specialization,
    });
  if (!row && !canPublish) throw new Error("Forbidden");
  if (row) revalidateStudyPlan(row.country, row.university, row.specialization);
  redirect("/admin/academic?saved=deleted");
}
