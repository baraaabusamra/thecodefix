@echo off
echo Running Tests...
call npx tsx --test tests/fixes.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Admin Pipeline Authorization Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-test-actions-auth.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Admin Pipeline Review Authorization Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-review-actions-auth.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Admin Pipeline Review Governance Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-review-actions-governance.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Curriculum Compiler Governance Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-compiler-governance.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Extraction Evidence-Link Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-extraction-evidence-link.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Extraction Failure-Safety Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-extraction-failure-safety.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Review Approval Atomicity Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-review-atomicity.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Review Rejection Atomicity Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-review-rejection-atomicity.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Publish Atomicity Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-publish-atomicity.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Review Concurrency Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-review-concurrency.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Same-Program Uniqueness Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-review-same-program-uniqueness.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Audit Log ID Regression Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-review-audit-id-regression.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Extraction Claim Uniqueness and Stale Recovery Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-extraction-claim.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Publish Provenance Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-publish-provenance.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Document Content Dedup Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-document-dedup.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Source Dedup Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-source-dedup.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Job Status Metadata Preservation Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-jobstatus-metadata.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Collection Job Enqueue Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-collection-job-enqueue.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Targeted Collection Job Claim Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-collection-job-targeted-claim.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Targeted Collection Job Process Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-collection-job-targeted-process.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Academic Indexability Quality Gate Tests...
call npx tsx --test tests/academic-indexability.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Link Check...
call npm run check:links
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Summary-Order Check...
call npm run check:summary-order
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Frontmatter Check...
call npm run check:frontmatter
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Blog/Reference Frontmatter Check...
call npm run check:blog-ref
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Redundant-H1 Check...
call npm run check:redundant-h1
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Reference Related-Links Check...
call npm run check:ref-related
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Reference Keyword-Overlap Check (informational, non-blocking)...
call npm run check:ref-keywords

echo Running Quiz Integrity Check...
call npm run check:quizzes
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Quiz Bank Integrity Check...
call npm run check:quiz-bank
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Roadmap Integrity Check...
call npm run check:roadmaps
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Academic Universities Integrity Check...
call npm run check:academic
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Academic Courses Integrity Check...
call npm run check:academic-courses
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Orphan Blog Post Check...
call npm run check:orphan-blog
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Typecheck...
call npx tsc --noEmit
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Build...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Lint...
call npm run lint
exit /b %errorlevel%
