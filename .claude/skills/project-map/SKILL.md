---
name: project-map
description: The Code Fix "mall map" — where every file lives, what it uses, who uses it, and where the errors are. Use FIRST when you need to find, understand or change something ("وين الملف الفلاني", "شو بيستخدم هذا", "you are here"), and to regenerate the map/MAP.md after structural changes.
---

# Project map — "أنت هنا"

Look a file up on the map **before** opening it. It costs a few lines instead of reading the file and grepping for callers.

```bash
node scripts/audit/where.mjs packages/content/src/tracks.ts     # zone › shop › file, imports, used-by, findings
node scripts/audit/where.mjs exam-actions           # partial names work
node scripts/audit/where.mjs --summary --min high   # every serious finding, one line each
```

If `audit-out/map.json` doesn't exist yet, build it (≈40s):

```bash
npm run map                                # scan + map + every package's README/MAP.svg (= node scripts/audit/run-all.mjs)
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

## What else the map writes

- `<package>/MAP.svg` + the section between `<!-- map:start -->` / `<!-- map:end -->` in `<package>/README.md`: the floor plan with a "you are here" pin, role, dependencies, users, size, findings, folders and most-used entry points. Required for every package by `tests/architecture-boundaries.test.mjs`.
- `docs/project-map/FLOOR.svg`: the whole floor plan (zones and positions come from `scripts/audit/zones.mjs` → `FLOOR`).

## Changing structure with the map

- A file with many `usedBy` is load-bearing: move it with `node scripts/v2/mv.mjs` (rewrites every importer) and re-run the tests.
- A new package shows up on the map automatically once it is in `scripts/v2/layout.mjs` (`npm run new-module` does that); give it a floor slot in `zones.mjs`.
- Never restructure and fix findings in the same PR.
