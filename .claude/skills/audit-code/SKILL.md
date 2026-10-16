---
name: audit-code
description: Check The Code Fix for code-syntax problems — TypeScript errors, ESLint, MDX that won't compile, broken frontmatter YAML, invalid JSON, and code snippets inside lessons that don't parse (js/ts/jsx/tsx/json/python). Use for "فحص الكود", "syntax check", before a PR, or after editing lessons with code blocks.
---

# Audit — Code syntax

## 1. Run (≈30s full, ≈3s with --skip-ts)

```bash
node scripts/audit/scan-code.mjs --out audit-out/main/code.json            # everything
node scripts/audit/scan-code.mjs --skip-ts --files /tmp/changed.txt \
     --out audit-out/local/code.json                                        # only changed lessons
```

What each category means:

| category | source | blocks deploy? |
|---|---|---|
| typescript | `tsc --noEmit` | yes |
| eslint | `eslint` | yes (CI) |
| mdx | `@mdx-js/mdx` + remark-gfm, same as `modules/learning/src/ui/Mdx.tsx` | yes — the page 500s |
| frontmatter | gray-matter YAML | yes |
| json | `JSON.parse` on `content/**/*.json` | yes |
| code-snippet | TypeScript parser / `python3 ast.parse` on fenced blocks | no — but learners copy it |

## 2. Summary only

```bash
node scripts/audit/build-map.mjs >/dev/null
node scripts/audit/where.mjs --summary --rule CODE- --top 40
node scripts/audit/where.mjs --summary --rule TS --top 20
```

## 3. Triage code-snippet findings (they are `confidence: verify`)

Open the block at the reported line and classify:

- **Real bug** (missing brace, wrong syntax) → fix the snippet.
- **Wrong language tag** (`typescript` block containing JSX → `tsx`; Mongo shell `show dbs` tagged `js` → `javascript` is still wrong, use `shell` or remove the shell line) → fix the tag.
- **Intentionally wrong example** → add ❌ or «خطأ» on the line before the fence; the scanner skips those.
- **Newer syntax than the scanner's runtime** (e.g. Python 3.14 features on a 3.13 parser) → leave it, note it.
- **Expression list, not a program** (`0 == ""` lines without semicolons) → add `;` or split into one expression per line — the same ASI trap bites real learners.

## 4. Fix loop

Fix → re-run with `--files` on just those files → zero new findings → run `npm run check:all` (project CI) before committing.
