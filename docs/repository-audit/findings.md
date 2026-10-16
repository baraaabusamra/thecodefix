# Initial Audit Findings

**Status:** Early static review; confirm each item against current HEAD before implementing fixes.  
**Scope:** Selected Claude commands, schema, content helpers, and check scripts.

## FIND-001 — Related-post ranking may drift in the orphan check

**Confidence:** High that the implementations differ; impact needs a fixture-based reproduction.  
**Severity:** Medium  
**Files:**
- src/lib/blog.ts
- scripts/check-orphan-blog.mjs

The production getRelatedPosts() implementation uses a score, then breaks ties by publication date. The orphan checker describes its local helper as an exact reproduction, but its sort only compares scores and does not apply the same recency tie-breaker. Where several posts tie around the top-four cutoff, the two functions can select different posts. That could produce an inaccurate orphan result.

**Next step:** Extract shared ranking logic into a testable helper or make the check's implementation and tests exactly match production behavior. Add a fixture with more than four tied candidates and verify deterministic results. Do not change production behavior without a regression test.

## FIND-002 — Schema-design command contains a potentially stale role inventory

**Confidence:** High  
**Severity:** Low to Medium  
**File:** .claude/commands/schema-design.md

The command's context list describes the role enum as student, support, writer, sales, operations, admin, owner. The currently inspected src/db/schema.ts also defines creator, marketing, and designer. The command therefore does not reflect the full role list in the schema snapshot.

**Next step:** Update the command's documented role inventory after checking the current schema and RBAC capability map. Prefer telling the agent to read the live enum and RBAC definitions rather than maintaining a duplicated static list.

## FIND-003 — Existing architecture documentation should be treated as the source to reconcile

**Confidence:** High  
**Severity:** Low  
**File:** docs/site-architecture.md

A substantial architecture document already exists and includes route, SEO, indexability, and content-pipeline context. V2 should link to it and record only verified deltas instead of introducing a competing permanent architecture description.

**Next step:** Once route-level tracing is complete, update the existing architecture document or clearly define the audit document as a dated snapshot.

## Explicit non-findings

- The existence of generated keyword lists is not itself a bug; it is a limitation if treated as real search-demand data.
- A lack of SKILL.md files in the inspected tree snapshot does not prove the project lacks useful agent instructions; the repository already has Claude commands and a large rules directory.
- No claim is made here that the full build or test suite fails or passes. This review did not execute them.
