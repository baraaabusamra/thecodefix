import { requireDb } from "@/db";
import { pipelineReviewQueue, pipelineCurriculumVersions, pipelineExtractionRuns, pipelinePrograms, pipelineUniversities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function PipelineReviewPage() {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) {
    redirect("/admin");
  }

  const db = requireDb();
  const reviews = await db.select({
    queue: pipelineReviewQueue,
    version: pipelineCurriculumVersions,
    run: pipelineExtractionRuns,
    program: pipelinePrograms,
    university: pipelineUniversities
  })
  .from(pipelineReviewQueue)
  .innerJoin(pipelineCurriculumVersions, eq(pipelineReviewQueue.curriculumVersionId, pipelineCurriculumVersions.id))
  .innerJoin(pipelineExtractionRuns, eq(pipelineReviewQueue.extractionRunId, pipelineExtractionRuns.id))
  .innerJoin(pipelinePrograms, eq(pipelineCurriculumVersions.programId, pipelinePrograms.id))
  .innerJoin(pipelineUniversities, eq(pipelinePrograms.universityId, pipelineUniversities.id))
  .orderBy(desc(pipelineReviewQueue.createdAt));

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Curriculum Extraction Review Queue</h1>
      
      <div className="bg-white rounded shadow p-4 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">University</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No items in the review queue.
                </td>
              </tr>
            ) : reviews.map((item) => (
              <tr key={item.queue.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    item.queue.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    item.queue.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.queue.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.university.universitySlug}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.program.specializationSlug}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.queue.reason}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.queue.createdAt.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/admin/pipeline/review/${item.queue.id}`} className="text-indigo-600 hover:text-indigo-900">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
