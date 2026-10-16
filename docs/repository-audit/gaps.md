# The Code Fix V2 — Gap Register

**Status:** Initial register. “Not found” means not identified in inspected files; it is not proof that no equivalent capability exists anywhere.

## Confirmed gaps or limitations in inspected areas

| ID | Gap / limitation | Evidence | Priority | Next action |
|---|---|---|---|---|
| GAP-001 | No SKILL.md files appeared in the inspected repository tree snapshot | Recursive tree inventory | Medium | Inspect existing commands and rules before designing Skills |
| GAP-002 | Admin SEO keyword positions are manually entered; Search Console API is described as future work | src/app/admin/seo/page.tsx and actions.ts | High for data-driven SEO | Define provider/data contract before integration |
| GAP-003 | Current reference keyword check detects exact collisions only within one reference section | scripts/check-ref-keyword-overlap.mjs | Medium | Design cross-content candidate analysis with labelled examples |
| GAP-004 | Blog related-post logic uses normalized keyword and title-token overlap, not explicit educational relationships | src/lib/blog.ts | Medium | Add graph diagnostics without silently changing public behavior |
| GAP-005 | Generated keyword clusters are templated from track/lesson names | src/lib/seo.ts | Medium | Distinguish metadata generation from evidence-based keyword research |

## Work still required to confirm or dismiss

| ID | Question | Priority | Evidence required |
|---|---|---|---|
| GAP-006 | Is there an existing machine-readable whole-repository dependency graph? | High | Inspect scripts, tooling, and generated reports |
| GAP-007 | Can current checks emit structured findings rather than console-only reports? | High | Inspect all check scripts and their tests |
| GAP-008 | Are content IDs and hashes used consistently across file and DB content? | High | Trace DB schema, content loaders, admin mutations, and migrations |
| GAP-009 | Which tests cover content/SEO rules, and which important edge cases are missing? | High | Map each check to tests and inspect fixtures |
| GAP-010 | Do existing Claude commands or Cursor rules already perform the planned Skill tasks? | High | Review all six commands and applicable rule files |
| GAP-011 | Which routes and APIs consume content and SEO helpers? | High | Trace imports/call sites and route behavior |
| GAP-012 | Can audit jobs run incrementally without rescanning all content? | Medium | Inspect scripts, CI constraints, hashes, and caching |
| GAP-013 | Which existing DB tables can store findings/history without a new migration? | Medium | Review src/db/schema.ts, migrations, and DB invariants |
| GAP-014 | Are external keyword/search data providers configured anywhere? | Medium | Inspect environment-variable references without exposing secrets |

## Suggested severity policy for future findings

- Critical: confirmed issue with substantial security, data-integrity, or severe user impact.
- High: broken content paths, misleading technical/security guidance, or major SEO/indexability defects.
- Medium: meaningful educational, linking, metadata, or maintainability issue.
- Low: cosmetic or optional improvement.
- Needs verification: insufficient evidence to claim the issue is real.

Severity and confidence are separate dimensions. An uncertain claim must not be presented as a confirmed defect.

## Exit criteria for Phase 00

- [ ] Route-to-library map completed for in-scope content and SEO flows.
- [ ] Check-script-to-test coverage map completed.
- [ ] Claude command and Cursor rule overlap reviewed.
- [ ] DB schema and migration impact reviewed.
- [ ] Inventory and gap counts regenerated from the current branch.
- [ ] Findings cross-checked against code and labeled confirmed / suspected / unknown.
- [ ] V2 implementation plan approved before source-code changes begin.
