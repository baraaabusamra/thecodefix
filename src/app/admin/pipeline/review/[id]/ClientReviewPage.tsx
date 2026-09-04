"use client";

import { useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type {
  pipelineReviewQueue,
  pipelineCurriculumVersions,
  pipelineDocuments,
  pipelineCurriculumCourses,
  pipelineCoursePrerequisites,
  pipelineExtractionEvidence,
} from "@/db/schema";
import { approveReview, rejectReview, publishCurriculum } from "./actions";

type ClientReviewPageProps = {
  queueItem: InferSelectModel<typeof pipelineReviewQueue>;
  version: InferSelectModel<typeof pipelineCurriculumVersions>;
  document: InferSelectModel<typeof pipelineDocuments>;
  courses: InferSelectModel<typeof pipelineCurriculumCourses>[];
  prereqs: InferSelectModel<typeof pipelineCoursePrerequisites>[];
  evidence: InferSelectModel<typeof pipelineExtractionEvidence>[];
};

export default function ClientReviewPage({
  queueItem,
  version,
  document,
  courses,
  prereqs,
  evidence
}: ClientReviewPageProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approveReview(queueItem.id, version.id);
    } catch (e) {
      // approveReview throws a clean, already-sanitized message for every
      // expected case (including the Phase 3.5B-3B concurrency conflict) —
      // same alert() convention already used by handlePublish below.
      alert(e instanceof Error ? e.message : "Failed to approve.");
    }
    setIsApproving(false);
  };

  const handleReject = async () => {
    await rejectReview(queueItem.id, version.id);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    const res = await publishCurriculum(version.id);
    if (res.success) {
      alert("Successfully compiled to legacy academic_study_plan!");
    } else {
      alert("Failed to publish: " + res.error);
    }
    setIsPublishing(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* LEFT: Original PDF */}
      <div className="w-1/2 h-full border-r border-gray-300 flex flex-col bg-gray-800">
        <div className="p-4 bg-gray-900 text-white font-semibold flex justify-between">
          <span>Original Document Viewer</span>
          <span className="text-sm font-normal text-gray-400">ID: {document.id}</span>
        </div>
        <div className="flex-1 w-full bg-gray-100">
          {document.storagePath ? (
            <iframe 
              src={document.storagePath} 
              className="w-full h-full" 
              title="PDF Viewer"
            />
          ) : (
            <div className="flex items-center justify-center h-full">No valid PDF URL found.</div>
          )}
        </div>
      </div>

      {/* RIGHT: Extracted Curriculum */}
      <div className="w-1/2 h-full flex flex-col bg-white overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold">{version.title}</h1>
              <p className="text-gray-500">Academic Year: {version.academicYear || "Unknown"}</p>
              <p className="text-gray-500 text-sm mt-1">Status: <span className="font-bold">{queueItem.status.toUpperCase()}</span></p>
            </div>
            <div className="flex gap-2">
              {queueItem.status === "pending" && (
                <>
                  <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Reject</button>
                  <button onClick={handleApprove} disabled={isApproving} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                </>
              )}
              {queueItem.status === "approved" && (
                <button onClick={handlePublish} disabled={isPublishing} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold">
                  Publish to Legacy
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <h2 className="text-xl font-semibold">Extracted Courses ({courses.length})</h2>
          
          {courses.map((course) => {
            const coursePrereqs = prereqs.filter((p) => p.curriculumCourseId === course.id);

            return (
              <div key={course.id} className="border border-gray-200 rounded p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold">
                    {course.officialCourseCode} - {course.officialCourseName}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-bold rounded ${
                    course.confidence === 'HIGH' ? 'bg-green-100 text-green-800' :
                    course.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {course.confidence?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-4">
                  <p>Credits: <strong>{course.credits}</strong></p>
                  <p>Semester: <strong>{course.semester || 'N/A'}</strong></p>
                  <p>Category: <strong>{course.category || course.courseType}</strong></p>
                </div>

                {coursePrereqs.length > 0 && (
                  <div className="mb-4 text-sm bg-gray-50 p-2 rounded">
                    <strong>Prerequisites:</strong>
                    <ul className="list-disc ml-4 text-gray-600">
                      {coursePrereqs.map((p) => <li key={p.id}>{p.prerequisiteText}</li>)}
                    </ul>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">
                  Evidence count for this run: {evidence.length} total. (See database for exact field mappings).
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
