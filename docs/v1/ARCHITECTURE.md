# Architecture — The Code Fix

How the **code** is organised, which way dependencies are allowed to point,
and where the trust boundaries are. For how the **site** is organised
(routes, internal linking, SEO, visitor journey) see
[`docs/site-architecture.md`](docs/site-architecture.md).

This document describes the repository as it is today. Where something is a
known gap rather than a rule, it says so under
[Known gaps](#known-gaps) — nothing here is aspirational.

---

## 1. Layers

There are four source layers, and no `src/features`, `src/infrastructure`,
`src/shared` or `src/config` directory. The structure is flatter than a
domain-driven layout and that is deliberate for a codebase this size.

```
src/app/         Next.js App Router: routes, pages, layouts, Server Actions
src/components/  React components, shared across routes
src/lib/         domain logic, content readers, and external-service adapters
src/db/          Drizzle schema + the database client
src/types/       ambient type declarations
```

Dependencies point one way:

```
src/app  ->  src/components  ->  src/lib  ->  src/db / src/types
```

Enforced by `tests/architecture-boundaries.test.mjs`:

| Rule | Why |
|---|---|
| `src/db` imports no app/components/lib code | the schema is the bottom of the graph; everything points at it |
| `src/lib` never imports a component | `src/lib` is domain and infrastructure code; pulling UI in inverts the direction |
| `src/lib` / `src/components` reach into `src/app` **only** through `"use server"` modules | see [the Server Action seam](#the-server-action-seam) |
| `src/types` imports no app or component code | ambient declarations stay at the bottom |
| no import cycles anywhere in `src/` | there are currently **zero**; a cycle makes module init order load-bearing |

`npm run typecheck` cannot catch any of these — every violation they describe
compiles perfectly. That is why they are tests.

### The Server Action seam

A client component importing `@/app/.../actions` looks like a layering
violation and is not one. Next.js replaces that import with an RPC stub, so
it is a call across a network boundary, not a dependency on route code. Thirteen
components do this today.

The rule therefore allows it **only** for modules carrying `"use server"`.
Importing any other module out of `src/app` into `src/lib` is a genuine
inversion and fails the test.

---

## 2. Authorization

Two separate questions, two modules:

| Question | Module |
|---|---|
| **Who** is calling? | `src/lib/admin-access.ts` — `resolveAdmin()`, which reads the session, the database and the `ADMIN_TOKEN` fallback |
| **May they do this?** | `src/lib/authorization.ts` — `requireCapability(cap)`, pure policy over `src/lib/rbac.ts` |

`src/lib/rbac.ts` holds the capability model: ten roles, twelve capabilities,
and `can(role, cap)` which fails closed on a missing role.

### Server Actions

Server Actions are public HTTP endpoints. A page having checked a capability
before rendering a form proves nothing about who POSTs to the action
afterwards, so **every privileged action re-verifies**:

```ts
const access = await requireCapability("content:edit");
```

`requireCapability` throws `"Forbidden"` unless the caller both resolves to an
admin and holds the capability. It returns the resolved access so a caller can
make a further decision — `content:edit` may draft, only `content:publish` may
go live — without resolving twice.

`tests/rbac-matrix.test.mjs` invokes **every** exported Server Action against
**all ten roles** through the real guard and the real capability table, with
the database behind a tripwire proxy. An action that is not declared there
fails the suite.

### Admin pages

`src/app/admin/layout.tsx` gates the admin area on `admin:view` only — and
support, writer, sales, marketing and designer all hold `admin:view`. So the
layout is **not** sufficient protection: every admin page must check its own
capability.

`tests/admin-page-capability-coverage.test.mjs` enforces that. A new admin
page must either call `can(access.role, "<capability>")` or be listed exempt
with a reason. The capability each page requires is locked, so one cannot be
quietly downgraded.

Three pages are legitimately exempt: the layout itself, the dashboard (which
is capability-*aware* — it renders only the cards `capabilitiesFor(role)`
allows), and `/admin/operations` (an unconditional redirect).

---

## 3. Assessments: the trust boundary

Two quiz systems sit on opposite sides of one boundary. Mixing them up is the
single most expensive mistake available in this codebase.

| | **Untrusted UI practice** | **Server-trusted assessment** |
|---|---|---|
| module | `src/lib/quiz.ts` | `src/lib/quiz-bank.ts` |
| data | `src/content/quizzes/<track>.json` | `src/content/quiz-bank/<track>.json` |
| answer key | **ships to the browser** (`answer`, `explain`) | never leaves the server (`SanitizedQuestion`) |
| graded | in the browser, by `QuizRunner` | on the server |
| result | UI state only | an `exam_attempt` row |

A practice quiz cannot hide its answer key — it grades itself locally. The
consequence is that **nothing reported from the practice path may be
believed**. Points, the leaderboard, quiz passes and certificates all read
server-graded attempts, via `src/lib/trusted-stats.ts`, which exists
specifically to keep the two apart.

Server code may use the *shape* of a practice quiz — `src/app/progress-actions.ts`
reads `questions.length` to validate an import — but must never take a score
from the client.

Progress follows the same split: `lesson_completion` rows are server-owned and
trusted; the localStorage blob in `src/lib/progress.ts` is a cache and the only
store for guests.

---

## 4. Server-only modules

Anything a `"use client"` module imports is compiled into the browser bundle.
These twelve must never land there:

```
src/auth.ts                 src/lib/authorization.ts
src/db/index.ts             src/lib/crypto.ts
src/db/schema.ts            src/lib/exam-policy.ts
src/lib/admin-access.ts     src/lib/quiz-bank.ts
src/lib/admin-token.ts      src/lib/stripe.ts
                            src/lib/stripe-sync.ts
                            src/lib/trusted-stats.ts
```

Four of them *are* imported by client components today — all four only as
`import type`, which the compiler erases. Nothing in the build would complain
if one were flipped to a value import, and for `quiz-bank.ts` that would ship
the exam answer key to the client. `tests/architecture-boundaries.test.mjs`
walks the real import graph from every client entry point and fails if any of
them becomes reachable through a value import.

The repository does not use the `server-only` package.

---

## 5. Database schema

`src/db/schema.ts` is the public entry point and the only import path
(`@/db/schema`) used by the app, `drizzle.config.ts` and the test helpers. The
tables live in eleven domain modules beneath it:

```
src/db/schema/
  auth.ts                 users, accounts, sessions, tokens, audit log, role enum
  billing.ts              Stripe subscriptions, webhook idempotency, org seats
  certificates.ts         verifiable records of a passed exam
  content.ts              CMS tracks/lessons, suggestions, SEO keywords
  progress.ts             user progress, lesson completions, leaderboard snapshots
  assessments.ts          lesson quiz attempts, exam attempts
  operations.ts           instructors, tickets, work reports, outreach
  creators.ts             creator pages, posts, notifications
  jobs.ts                 job alert leads
  academic.ts             university study plans
  curriculum-pipeline.ts  discovery -> collection -> extraction -> review
```

`auth.ts` is a leaf — every other domain references `users`, and nothing is
imported back into it, so the modules are acyclic.

Two things are deliberate and load-bearing:

- **The barrel re-exports name by name, not with `export *`.** The test runner
  loads TypeScript through `tsx`, which compiles these to CommonJS, and star
  re-exports do not survive that round trip: `import * as schema` comes back
  empty, silently handing the PGlite test helpers a schema with no tables.
- **The split changed no SQL.** No table, column, type, default, index,
  foreign key, constraint or enum value moved with it.
  `tests/db-schema-modules.test.mjs` locks the 42 physical table names.

Migrations in `drizzle/` are append-only and lock-verified by
`npm run check:migrations`.

---

## 6. External services

`src/lib` holds the adapters as well as the domain logic — there is no
separate infrastructure layer. The adapters are:

| Area | Modules |
|---|---|
| Database | `src/db/index.ts` (Neon over HTTP; **dormant when `DATABASE_URL` is unset**) |
| Auth | `src/auth.ts` (Auth.js) |
| Payments | `src/lib/stripe.ts`, `src/lib/stripe-sync.ts` |
| Jobs feed | `src/lib/jooble.ts`, `src/lib/job-search.ts` |
| Curriculum pipeline | `src/lib/curriculum/**` — discovery (Tavily), collection (HTTP/PDF), extraction (Gemini), jobs |

Optional integrations stay dormant until their environment variables are set,
rather than failing at boot — see `src/lib/flags.ts`. Curriculum extraction is
additionally gated by `CURRICULUM_EXTRACTION_ENABLED`, which fails closed:
provider API keys alone are not enough to enable paid extraction.

---

## 7. Known gaps

Honest list of what is *not* true yet.

- **`src/lib` is still a flat catch-all** (~70 modules). Two obvious
  groupings exist — the 18 `admin-*` modules and the 4 `academic-*` modules —
  but both are on hold: their importers include files being edited on a
  parallel branch, and moving them now would mean import churn straight into a
  merge conflict.
- **`src/lib/curriculum/extraction/anthropic.ts` is unreferenced.** It is a
  complete second implementation of `CurriculumExtractionProvider`; the
  pipeline hardcodes the Gemini one. Keeping or dropping it is a product
  decision about extraction strategy.
- **`src/lib/base_repository.ts` and `src/lib/react-base-repository.tsx` are
  unreferenced by any code.** `CURRICULUM_UPGRADE_PLAN.md` describes them as
  educational examples for the Microservices and React tracks, so whether they
  belong in `src/lib` is a curriculum question.
- **Admin page guards are still hand-written**, three lines each, repeated
  across ~29 pages. The capability is enforced and tested, but unlike the
  Server Actions there is no shared primitive — the page variant needs three
  outcomes (render nothing / render `<Forbidden>` / proceed) and a helper that
  collapses them loses the distinction between a signed-out visitor and a
  signed-in one lacking the capability.
- **No dependency-boundary ESLint rules.** The boundaries are enforced by
  tests instead. A lint plugin would surface them in the editor.

---

## 8. Checks

```
npm run typecheck        tsc --noEmit
npm run lint             eslint
npm test                 tests/**/*.test.mjs via tsx (needs Node >= 24)
npm run check:all        content, SEO and migration gates
npm run build            production build
npm run check:links      internal links resolve
npm run check:migrations migration set is locked and undrifted
```

The architecture-specific suites are `tests/architecture-boundaries.test.mjs`,
`tests/db-schema-modules.test.mjs`, `tests/admin-page-capability-coverage.test.mjs`
and `tests/rbac-matrix.test.mjs`.
