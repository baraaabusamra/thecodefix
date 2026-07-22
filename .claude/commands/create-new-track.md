---
description: Build a brand-new learn track from scratch (not a gap-fill) — full lesson curriculum, reference section, and a real local build check — for a language/framework the site doesn't cover yet
argument-hint: <track-slug> <Display Name> <icon-emoji> <one-line Arabic description of the track>
---

You are building a **brand-new** track for **The Code Fix** (thecodefix.net) — an Arabic (RTL) learn-to-code platform, Next.js 16 App Router. This is NOT a gap-fill (the track doesn't exist yet) — you are creating it from nothing, matching the depth and quality of existing tracks.

Target: `$ARGUMENTS` (track slug, display name, icon, description).

## 0. Guardrails (same as the gap-fill pipeline, non-negotiable)

- Corroborate every technical claim against **≥2 independent, authoritative sources** (official docs first). Never fabricate syntax or behavior.
- Never copy text or code verbatim from any source — everything you write is original, in the site's Arabic voice.
- Only touch files under `src/content/tracks/<slug>/`, `src/content/reference/<slug>.json` (if applicable), `src/lib/reference.ts` (only the registration line), and optionally one new file under `src/content/blog/`. Never touch anything else.
- **Do not open a PR and do not push anywhere.** This run's output stays as local commits on your current branch — a separate consolidation step handles PRs. End your turn once your local build check passes.

## 1. Study the pattern first

Read 2-3 existing tracks of comparable scope end-to-end before writing anything — their `_meta.json`, every lesson's frontmatter shape (`title`, `description`, `order`, `keywords`) and body structure (headings, fenced code blocks in the target language, `>` blockquote tips with 💡, comparison tables, a closing "🎯 التالي" pointer chain, a final numbered summary lesson). Good references: `src/content/tracks/python/`, `src/content/tracks/kotlin/`, `src/content/tracks/typescript/`. Also read `src/lib/reference.ts` for the exact `RefSection`/`RefEntry` TypeScript shapes if this track will get a reference section.

## 2. Build the curriculum

Research an appropriate beginner→intermediate curriculum for this language/framework via official docs. Write **15-18 lessons** (numbered `00-...` through the summary lesson) covering: setup/fundamentals → core syntax/concepts → intermediate features → one or two practical/idiomatic-patterns lessons → a closing summary lesson with a "what's next" pointer. Each lesson: original Arabic prose, original runnable code examples in the target language, matching sibling-track density (roughly 80-150 lines per lesson).

Create `src/content/tracks/<slug>/_meta.json`:
```json
{ "title": "<Display Name>", "description": "<one-line Arabic description>", "icon": "<emoji>", "color": "<a hex color fitting the brand palette, distinct from existing tracks>", "order": <next available integer, higher than the current max> }
```
(Check existing `_meta.json` files for the current max `order` first.)

## 3. Reference section (if the tech has enough distinct API/keyword surface)

If this language/framework has enough standalone keywords/functions/components to justify a reference section (most do), create `src/content/reference/<slug>.json` with 10-15 entries matching the exact `RefEntry` schema, and add one `RefSection` object to `REF_SECTIONS` in `src/lib/reference.ts` (`playgroundMode: "js"` only if it can genuinely run live in an eval'd JS sandbox in-browser like the existing `javascript`/`react` sections — check `src/components/Playground.tsx` first if unsure; otherwise `"none"`).

## 4. Blog check

Search `src/content/blog/` for an existing post covering this tech's most natural comparison or common-error angle. If none exists and one is genuinely warranted, write one matching the existing frontmatter shape (`title`, `description`, `updated`, `tldr`, `date`, `keywords`, `faq`).

## 5. MANDATORY: prove it actually builds

This is the step that was skipped before and broke production twice. Before ending your turn:

```
npm run build
```

This must complete with **exit code 0 and zero errors**. Common failure modes to watch for, from real incidents on this exact codebase:
- Raw generic/angle-bracket syntax in headings or prose outside backticks (e.g. `## Box<T>` instead of `` ## `Box<T>` ``) — MDX parses it as broken JSX and the build fails.
- Any string in your content that looks like a real CSS/Tailwind utility class containing a literal placeholder like `url(...)` — Tailwind's content scanner will try to generate it and fail to resolve the literal `...` as a path. Never write a literal `...` inside anything that looks like `[url(...)]`, `bg-[...]`, etc. — use a real-looking placeholder path instead, or avoid the bracket syntax entirely in prose.
- Broken/duplicate `order` numbers or a "🎯 التالي" pointer chain that references a filename that doesn't exist.

If the build fails, read the actual error, fix the real file it points to, and rebuild. Do not stop until `npm run build` exits 0. Do not skip this step or claim success without having actually run it and seen it pass.

## 6. Report

End with: track slug, lesson count, reference entry count (if any), blog post added (if any), confirmation that `npm run build` passed with the exact final line of build output, and anything deferred.
