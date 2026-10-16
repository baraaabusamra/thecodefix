---
name: audit-content
description: Check The Code Fix lessons, blog posts and reference entries for writing problems — Arabic spelling slips, inconsistent technology names, leftover TODOs, broken structure, empty sections, missing alt text, thin pages, future dates, duplicate titles — plus the project's own check:all. Use for "فحص المحتوى", "تدقيق الكتابة", content PRs, or before publishing a wave.
---

# Audit — Content writing

Built on `docs/content-guidelines.md` and `docs/seo-technical-policy.md` (both auto-loaded via AGENTS.md). The scanner adds checks those CI scripts don't have; `--with-checks` folds the CI ones in.

## 1. Run (≈2s for all 1,400+ pages)

```bash
node scripts/audit/scan-content.mjs --with-checks --out audit-out/main/content.json
# one track:
git ls-files 'src/content/tracks/python/*.mdx' > /tmp/py.txt
node scripts/audit/scan-content.mjs --files /tmp/py.txt --out audit-out/local/content.json
```

## 2. Summary

```bash
node scripts/audit/build-map.mjs >/dev/null
node scripts/audit/where.mjs --summary --rule CNT- --min low --top 40
node scripts/audit/where.mjs --summary --rule CNT-THIN --top 100   # thin pages by track
```

## 3. How to act on each rule

| Rule | Action |
|---|---|
| CNT-CHECK | Blocks CI — fix first. |
| CNT-SPELLING / CNT-REPEAT | Fix directly; they are high-precision. |
| CNT-ENTITY | Use the canonical name (guidelines §38). Don't touch code, URLs, or inline `code`. |
| CNT-PLACEHOLDER, CNT-FENCE, CNT-DATE | Fix. A future `updated` date violates seo-policy §13. |
| CNT-HEADING-JUMP / -DUP / EMPTY-SECTION / IMG-ALT | Fix structure; empty section usually means a lost paragraph. |
| CNT-TITLE-DUP | Run the page-existence test (guidelines §7): merge, differentiate the intent, or 301. A blog post and a lesson with the same title compete for the same query. |
| CNT-THIN | **Do not pad.** §19: length follows need. Decide per page: expand with what a learner actually needs (why / when / common mistake / exercise), or merge into a broader lesson. Batch these per track — they are V2 planning input, not quick fixes. |
| CNT-DESC-LENGTH | Info; shorten when you touch the page anyway. |

## 4. Rules for edits

- Don't bump `updated` unless the content meaningfully changed.
- Keep Arabic natural (guidelines §14); English stays English where that's the convention.
- New high-precision mistakes you spot repeatedly → add them to the `SPELLING` list in `scripts/audit/scan-content.mjs` so the script catches them next time instead of you.
