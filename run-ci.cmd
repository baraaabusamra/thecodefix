@echo off
echo Running Tests...
npx tsx --test tests/fixes.test.mjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Link Check...
npm run check:links
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
