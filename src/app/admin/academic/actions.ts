"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { requireDb } from "@/db";
import { academicStudyPlans } from "@/db/schema";
import { getUniversity, getSpecialization } from "@/lib/academic-universities";
import type { StudyPlanCategory } from "@/lib/academic-study-plans";

async function assertContentAccess() {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) {
    throw new Error("Forbidden");
  }
}

function revalidateStudyPlan(country: string, university: string, specialization: string) {
  revalidatePath(`/academic/${country}/${university}/${specialization}`);
  revalidatePath("/admin/academic");
}

export async function saveStudyPlan(formData: FormData) {
  await assertContentAccess();
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
  } catch {
    redirect(
      `/admin/academic/edit?country=${country}&university=${university}&specialization=${specialization}&error=json`
    );
  }

  await db
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
        updatedAt: new Date(),
      },
    });

  revalidateStudyPlan(country, university, specialization);
  redirect(
    `/admin/academic/edit?country=${country}&university=${university}&specialization=${specialization}&saved=1`
  );
}

export async function deleteStudyPlan(formData: FormData) {
  await assertContentAccess();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");

  const [row] = await db
    .delete(academicStudyPlans)
    .where(eq(academicStudyPlans.id, id))
    .returning({
      country: academicStudyPlans.country,
      university: academicStudyPlans.university,
      specialization: academicStudyPlans.specialization,
    });
  if (row) revalidateStudyPlan(row.country, row.university, row.specialization);
  redirect("/admin/academic?saved=deleted");
}
