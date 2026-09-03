import { requireDb } from "@/db";
import { eq } from "drizzle-orm";
import { 
  pipelineReviewQueue, 
  pipelineCurriculumVersions, 
  pipelineCurriculumCourses, 
  pipelineExtractionRuns,
  pipelineDocuments,
  pipelineExtractionEvidence,
  pipelineCoursePrerequisites
} from "@/db/schema";
import ClientReviewPage from "./ClientReviewPage";
import { notFound, redirect } from "next/navigation";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";

export default async function ReviewItemPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) {
    redirect("/admin");
  }

  const { id } = await params;
  const db = requireDb();
  const [queueItem] = await db.select().from(pipelineReviewQueue).where(eq(pipelineReviewQueue.id, id));
  if (!queueItem) notFound();

  const [version] = await db.select().from(pipelineCurriculumVersions).where(eq(pipelineCurriculumVersions.id, queueItem.curriculumVersionId!));
  const [run] = await db.select().from(pipelineExtractionRuns).where(eq(pipelineExtractionRuns.id, queueItem.extractionRunId!));
  const [document] = await db.select().from(pipelineDocuments).where(eq(pipelineDocuments.id, run.documentId));

  const courses = await db.select().from(pipelineCurriculumCourses).where(eq(pipelineCurriculumCourses.curriculumVersionId, version.id));
  const prereqs = await db.select().from(pipelineCoursePrerequisites); // We filter client side
  const evidence = await db.select().from(pipelineExtractionEvidence).where(eq(pipelineExtractionEvidence.extractionRunId, run.id));

  return (
    <ClientReviewPage
      queueItem={queueItem}
      version={version}
      document={document}
      courses={courses}
      prereqs={prereqs}
      evidence={evidence}
    />
  );
}
