---
description: Audit one learn track against real-world sources, research and write any missing lessons/reference entries/blog articles, then open a PR for human review (never merges, never pushes to main)
argument-hint: <track-slug, e.g. go> [--refresh] (--refresh = check for new language/framework releases instead of a full gap audit)
---

You are running the automated content-gap pipeline for **The Code Fix** (thecodefix.net) — an Arabic (RTL) learn-to-code platform. Target track: `$ARGUMENTS`.

Read `AGENTS.md` at the repo root first (breaking-changes warning about this Next.js version) — it doesn't block this task (no app code changes) but is a standing project rule.

## 0. Guardrails (non-negotiable)

- **Never push to `main` and never merge a PR.** All output lands on a new branch via a PR marked as pending human review. This is the site's only "draft" mechanism — there is no `draft:true` field in the content schema.
- **Never fabricate facts, syntax, or version numbers.** Every technical claim in generated content must be corroborated by **at least 2 independent, authoritative sources** (official docs/spec first, e.g. go.dev, developer.mozilla.org, official language release notes; reputable tutorials second). If you can't corroborate a claim, drop it rather than guess.
- **Never copy text or code verbatim from sources.** Everything you write — prose and code examples — must be original, written by you, in the site's Arabic voice. Sources inform facts and structure, not wording. (This mirrors the project's existing rule for book-derived content: derive topics/structure, never lift text.)
- **Keep PRs small and reviewable.** Cap each run at roughly 3–4 new lessons and ~12 new reference entries. If the gap is bigger than that, do the highest-priority subset and note what's left for the next run.
- If the track is already essentially complete against your research and nothing new has shipped, **do nothing** — do not open an empty or padding-only PR. Say so in your final report.

## 1. Inventory what already exists

- `content/ar/tracks/<track>/_meta.json` — track title/description/icon/color/order.
- `content/ar/tracks/<track>/*.mdx` — read every lesson's frontmatter (`title`, `description`, `order`, `keywords`) and skim its body to know what's actually covered, not just the filename.
- `content/ar/reference/<track>.json` — if it exists, read every entry (`slug`, `title`, `category`). If it doesn't exist yet, note that this track has no reference section at all.
- `packages/content/src/reference.ts` — the `RefEntry` type (exact field list) and `REF_SECTIONS` array (needed if you must register a brand-new reference section).
- Grep `content/ar/blog/` for existing posts already covering this track (comparisons, error explainers) so you don't duplicate one.

## 2. Build the "should exist" baseline

Use WebSearch/WebFetch against official sources for the language/framework (official docs, official tour/spec, official release notes) to build a topic checklist a complete beginner→intermediate track should cover. Cross-check with 1–2 well-regarded independent tutorials for structure only (never content).

If `--refresh` was passed: skip the full baseline and instead search specifically for what changed since the newest date/version referenced in the existing lessons/reference (e.g. official release notes) — this is the "something new shipped" check, not a full re-audit.

## 3. Diff and prioritize

Compare the baseline topic list against what's already covered (step 1). Produce a ranked gap list — most fundamental/most-searched topics first. Drop anything already covered even partially under a different name (search-match on meaning, not exact title strings).

## 4. Research each gap, verify, then write original content

For each gap you're taking in this run:
- Gather facts from ≥2 authoritative sources; note the URLs you used (they go in the PR description, not in the content).
- Write a new lesson file `content/ar/tracks/<track>/NN-slug.mdx` (NN = next order number after the current max). Match the exact style of sibling lessons in that track: frontmatter shape (`title`, `description`, `order`, `keywords`), heading structure, fenced code blocks in the track's language, comparison tables where natural, `>` blockquote tips (💡) and a closing "🎯 التالي" pointer if a natural next lesson exists. Update the *previous* last lesson's closing pointer line if it now points to your new lesson.
- If the track has a reference file, append new `RefEntry` objects (exact schema from `packages/content/src/reference.ts`) grouped under sensible `category` values consistent with existing entries. If the track has **no** reference file yet, create `content/ar/reference/<track>.json` and add a matching `RefSection` block to `REF_SECTIONS` in `packages/content/src/reference.ts` (title/entityLabel/icon/intro/track/playgroundMode/attributesTitle/attributesHeader — infer `playgroundMode` from whether the language runs live in-browser: `"js"`/`"html"` only for JS/HTML/CSS-family, `"none"` for anything compiled/interpreted server-side like Go).
- If the gap naturally supports a comparison or common-error article (this site's SEO strategy treats that cluster as high-value) and none already exists, write one blog post under `content/ar/blog/` matching the existing frontmatter shape (`title`, `description`, `updated`, `tldr`, `date`, `keywords`, `faq`). Don't force one if it wouldn't be genuinely useful.

## 5. Ship it for review, not to users

```
git checkout -b content/<track>-gap-fill-<YYYY-MM-DD>
git add <only the files you created/changed>
git commit -m "..."
git push -u origin content/<track>-gap-fill-<YYYY-MM-DD>
gh pr create --title "..." --body "..."
```

PR body must include: a bullet list of what was added (lessons/reference entries/blog posts), the sources consulted per item, and this line verbatim near the top: **"⏸️ رهن المراجعة البشرية — ما في شي بينشر تلقائي على الموقع لحد ما يتم دمج هالـ PR يدويًا."**

Do not touch any files outside `content/ar · content/data` and (only if registering a brand-new reference section) `packages/content/src/reference.ts`.

## 6. Report back

End with a short summary: track audited, gaps found vs. addressed this run, PR URL, and anything explicitly deferred to a future run.
