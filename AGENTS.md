<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Content governance

@docs/content-guidelines.md

Any work that creates or edits site content (blog posts, learn lessons, reference entries, quizzes, exercises, projects) must follow that framework — run the page-existence test (section 7) before creating a new page, and prefer merge/update over a new URL when in doubt.

# SEO technical policy

@docs/seo-technical-policy.md

Mechanical, enforced rules (title/description length, no duplicate H1, internal links must resolve, no orphaned blog posts, reference `related[]` must resolve, summary lessons sort last, etc.) — every rule maps to a permanent check in `run-ci.cmd`. Run `run-ci.cmd` (or the individual `npm run check:*` scripts) before considering any content change done.

# Factual data governance (read on demand, not auto-loaded)

Working on `src/content/academic-universities/`, `src/content/academic-study-plans/`, `src/lib/curriculum/` (the extraction pipeline), or `/jobs` content? Read `docs/factual-data-governance.md` first — it's deliberately *not* imported here like the two files above, since its provenance/source-hierarchy/versioning rules only apply to factual/extracted data, not editorial lessons or blog posts.
