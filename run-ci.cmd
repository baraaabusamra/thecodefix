@echo off
echo Running Tests...
npx tsx --test tests/fixes.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Link Check...
npm run check:links
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Summary-Order Check...
npm run check:summary-order
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Frontmatter Check...
npm run check:frontmatter
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Blog/Reference Frontmatter Check...
npm run check:blog-ref
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Redundant-H1 Check...
npm run check:redundant-h1
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Reference Related-Links Check...
npm run check:ref-related
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Reference Keyword-Overlap Check (informational, non-blocking)...
npm run check:ref-keywords

echo Running Quiz Integrity Check...
npm run check:quizzes
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Roadmap Integrity Check...
npm run check:roadmaps
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Academic Universities Integrity Check...
npm run check:academic
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Academic Courses Integrity Check...
npm run check:academic-courses
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Typecheck...
npx tsc --noEmit
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Build...
npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Lint...
npm run lint
exit /b %errorlevel%
