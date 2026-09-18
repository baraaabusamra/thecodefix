@echo off
rem Local Windows entry point for the production validation pipeline.
rem It runs exactly what GitHub Actions runs (.github/workflows/ci.yml):
rem   npm run ci  =  typecheck -> lint -> npm test -> check:all -> build
rem Edit package.json / scripts/run-tests.mjs / scripts/run-checks.mjs, not this file.
call npm run ci
exit /b %errorlevel%
