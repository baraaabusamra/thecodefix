---
name: v2-architecture
description: The Code Fix V2 monorepo rules — where new code goes (apps/web vs modules/* vs packages/* vs content/), which imports are allowed, how to add a module, move a file, port an old branch, or add a language/video/API endpoint without breaking the boundaries. Use BEFORE writing, moving or importing code in this repo.
---

# V2 architecture — where does this go?

Read `docs/v2/ARCHITECTURE.md` once per session if you have not. The rules below are enforced by `tests/architecture-boundaries.test.mjs`; breaking one fails CI.

## 1. Locate first (cheap)

```bash
node scripts/audit/where.mjs <file-or-partial>   # zone › folder › file, imports, used-by, findings
```

Each package's `README.md` shows its place on the map, its dependencies and its most-used entry points.

## 2. Decide the home

| You are writing… | Put it in | Import it as |
|---|---|---|
| a page / URL | `apps/web/src/app/…` (thin: compose modules) | — |
| feature logic (read/write/rules) | `modules/<feature>/src/<name>.ts` | `@tcf/<feature>/<name>` |
| a form that writes data | `modules/<feature>/src/actions/<name>.ts` with `"use server"` and `requireCapability(...)` / `auth()` | `@tcf/<feature>/actions/<name>` |
| UI for one feature | `modules/<feature>/src/ui/<Component>.tsx` | `@tcf/<feature>/ui/<Component>` |
| generic UI (no feature knowledge) | `packages/ui/src/ui/` | `@tcf/ui/ui/<Component>` |
| something ≥2 features need | a foundation in `packages/*` (or a new one) | `@tcf/<pkg>/<name>` |
| lesson / post / reference / quiz | `content/ar/…` (other locales: `content/<locale>/…`) | read via `@tcf/content/*` — never `process.cwd()` |
| a table | `packages/db/src/schema/<domain>.ts` + a NEW migration (`npm run db:generate`); never edit old migrations | `@tcf/db/schema` |
| an atomic multi-step write | `withTransaction()` from `@tcf/db/transaction` | — |
| a mobile/API endpoint | `apps/web/src/app/api/v1/…` + schema in `@tcf/contracts/api-v1` + test validating against it | — |
| a video source | `modules/media/src/providers/<name>.ts` + register in `provider.ts` | — |

## 3. Import rules

- Direction: `apps/web → modules/* → packages/*`. Packages never import modules or apps; modules never import apps.
- Module → module only if listed in `MODULE_DEPS` (test file). Prefer moving the shared piece into a foundation. A new edge needs an ADR in `docs/v2/adr/`.
- `@/…` is apps/web only. Everywhere else use `@tcf/<pkg>/<path>` (no barrel `index.ts` files — import the exact file).
- Server-only files (db, identity, crypto, quiz-bank, stripe, transaction, trusted-stats) must not be reachable from `"use client"` code except via `import type`.
- After adding an import of another package: `npm run workspaces:sync` (declares it in package.json).

## 4. Structural changes — use the tools, not hand edits

| Task | Command |
|---|---|
| new feature module / foundation | `npm run new-module <kebab-name> "<وصف عربي>" [-- --foundation]` |
| move a file and fix every importer | `node scripts/v2/mv.mjs <from> <to>` |
| replay an old V1 branch on V2 | `npm run port-branch -- <branch>` |
| redraw the map + per-package "you are here" | `npm run map` |

## 5. Done means

```bash
npm run typecheck && npm run lint && npm test && npm run check:all
npm run map            # README map sections + MAP.svg stay truthful
```

Public URLs must not change; if one must, add a 301 in `apps/web/next.config.ts` (seo-technical-policy §4, §12).
