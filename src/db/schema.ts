// Database schema - public entry point.
//
// The tables live in domain modules under ./schema/. This file stays the
// single import path for the whole app (`@/db/schema`), for drizzle.config.ts
// and for the test helpers, so the split is invisible to every caller.
//
// Dependency direction between the modules is one-way: auth.ts owns `users`
// and the other domains point at it, never the reverse, so there are no
// cycles. tests/db-schema-modules.test.mjs enforces that, and that this
// barrel keeps re-exporting every symbol the modules define.
//
// The re-exports are spelled out instead of `export * from "./schema/x"`
// on purpose: the test runner loads TypeScript through tsx, which compiles
// these to CommonJS, and star re-exports do not survive that round trip.
// `import * as schema` would come back empty, quietly emptying the PGlite
// test helpers and drizzle's relational query metadata.

export {
  userRole,
  users,
  accounts,
  sessions,
  verificationTokens,
  auditLogs,
} from "./schema/auth";
export type { User, NewUser, AuditLog } from "./schema/auth";

export {
  billingStatus,
  subscriptions,
  stripeEvents,
  organizations,
  organizationMembers,
} from "./schema/billing";
export type { Subscription, Organization } from "./schema/billing";

export { certificateStatus, certificates } from "./schema/certificates";
export type { Certificate } from "./schema/certificates";

export {
  seoKeywords,
  contentTracks,
  lessonStatus,
  contentLessons,
  suggestions,
} from "./schema/content";
export type {
  Suggestion,
  ContentTrack,
  ContentLesson,
  SeoKeyword,
} from "./schema/content";

export {
  userProgress,
  lessonCompletions,
  leagueSnapshots,
} from "./schema/progress";
export type { UserProgress } from "./schema/progress";

export {
  quizAttemptStatus,
  lessonQuizAttempts,
  examAttempts,
} from "./schema/assessments";
export type { LessonQuizAttempt, ExamAttempt } from "./schema/assessments";

export {
  instructorStatus,
  instructors,
  instructorTracks,
  ticketStatus,
  ticketPriority,
  tickets,
  ticketReplies,
  reportStatus,
  reportCategory,
  workReports,
  outreachGuide,
  outreachStatus,
  outreachContacts,
} from "./schema/operations";
export type {
  Instructor,
  InstructorTrack,
  Ticket,
  TicketReply,
} from "./schema/operations";

export {
  submissionStatus,
  creators,
  posts,
  notifications,
} from "./schema/creators";
export type {
  Creator,
  NewCreator,
  Post,
  NewPost,
  Notification,
  NewNotification,
} from "./schema/creators";

export { jobAlerts } from "./schema/jobs";
export type { JobAlert, NewJobAlert } from "./schema/jobs";

export { academicStudyPlans } from "./schema/academic";
export type {
  AcademicStudyPlanRow,
  NewAcademicStudyPlanRow,
} from "./schema/academic";

export {
  pipelineJobStatus,
  pipelineSourceType,
  pipelineConfidenceLevel,
  pipelineUniversities,
  pipelinePrograms,
  pipelineSources,
  pipelineDocuments,
  pipelineExtractionRuns,
  pipelineExtractionEvidence,
  pipelineCurriculumVersions,
  pipelineCourses,
  pipelineCurriculumCourses,
  pipelineCoursePrerequisites,
  pipelineCollectionJobs,
  pipelineReviewQueue,
} from "./schema/curriculum-pipeline";
