---
name: project-map
description: The Code Fix "mall map" — where every file lives, what it uses, who uses it, and where the errors are. Use FIRST when you need to find, understand or change something ("وين الملف الفلاني", "شو بيستخدم هذا", "you are here"), and to regenerate the map/MAP.md after structural changes.
---

# Project map — "أنت هنا"

Look a file up on the map **before** opening it. It costs a few lines instead of reading the file and grepping for callers.

```bash
node scripts/audit/where.mjs src/lib/content.ts     # zone › shop › file, imports, used-by, findings
node scripts/audit/where.mjs exam-actions           # partial names work
node scripts/audit/where.mjs --summary --min high   # every serious finding, one line each
```

If `audit-out/map.json` doesn't exist yet, build it (≈40s):

```bash
node scripts/audit/run-all.mjs             # scan + map + docs/project-map/map-data.js
node scripts/audit/run-all.mjs --fast      # content-only changes
node scripts/audit/run-all.mjs --branches  # include all unmerged branches
```

## What's on the map

- **Zones** (districts) are defined in `scripts/audit/zones.mjs` — order matters, first match wins. Add a zone or move a matcher there when V2 reorganises folders; the map, MAP.md and where.mjs all follow.
- **Shops** = folders (lessons are grouped per track).
- **Edges** = resolved `import` statements (`@/` alias and relative).
- **Pins** = findings from audit-security / audit-code / audit-content, on their exact line.

Outputs:
- `docs/project-map/MAP.md` — text map (committed, regenerated).
- `docs/project-map/index.html` + `map-data.js` — interactive mall map (data file is generated, not committed).

## Planning V2 with the map

- A file with many `usedBy` is load-bearing: move it last, with a re-export shim.
- A zone with mixed responsibilities (see `src/lib · متفرقات`) is the first candidate to split.
- Never restructure and fix findings in the same PR.
