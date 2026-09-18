@echo off
echo Running Tests...
call npx tsx --test tests/fixes.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Pricing CTA Tests...
call npx tsx --test tests/pricing-cta.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Analytics Event Contract Tests...
call npx tsx --test tests/analytics-events.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Curriculum Extraction Gate Tests...
call npx tsx --test tests/curriculum-extraction-gate.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Operational Hardening Tests...
call npx tsx --test tests/operational-hardening.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Public Write Rate Limit Tests...
call npx tsx --test tests/rate-limit-public-writes.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Admin Pipeline Authorization Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-test-actions-auth.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Extraction Evidence-Link Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-extraction-evidence-link.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Extraction Failure-Safety Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-extraction-failure-safety.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Extraction Claim Uniqueness and Stale Recovery Tests...
call npx tsx --experimental-test-module-mocks --test tests/pipeline-extraction-claim.test.mjs
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

echo Running Phase 0 Security Tests...
call npx tsx --test tests/mdx-untrusted-security.test.mjs tests/certificate-trust.test.mjs tests/python-sandbox.test.mjs tests/progress-integrity.test.mjs tests/quiz-bank.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%
call npx tsx --experimental-test-module-mocks --test tests/certificate-integrity.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%
call npx tsx --experimental-test-module-mocks --test tests/quiz-exam-certificate-security.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%
call npx tsx --experimental-test-module-mocks --test tests/content-publish-rbac.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%
call npx tsx --experimental-test-module-mocks --test tests/admin-fallback-security.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%
call npx tsx --experimental-test-module-mocks --test tests/encryption-fail-closed.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%
call npx tsx --experimental-test-module-mocks --test tests/creator-url-validation.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%
call npx tsx --experimental-test-module-mocks --test tests/pro-checkout-gate.test.mjs
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
