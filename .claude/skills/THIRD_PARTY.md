# Third-party skills

These skills are vendored unchanged from their official sources so every
session has them without a network install. Each SKILL.md was read in full before it
was added (no install scripts, no network calls, no instructions outside its
stated scope). Update by re-copying from the source at a newer commit.

| Skill folder | Source | Commit | License |
|---|---|---|---|
| `turborepo` | [vercel/turborepo](https://github.com/vercel/turborepo/tree/main/skills/turborepo) | `74c9fbc` | MIT |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | `063bee9` | MIT |
| `vercel-composition-patterns` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) | `063bee9` | MIT |
| `vercel-react-native-skills` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-native-skills) | `063bee9` | MIT |
| `next-dev-loop` | [vercel/next.js](https://github.com/vercel/next.js/tree/canary/skills/next-dev-loop) | `a6d4c15` | MIT |
| `seo-audit` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/main/skills/seo-audit) | `365b412` | MIT |
| `ai-seo` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/main/skills/ai-seo) | `365b412` | MIT |
| `programmatic-seo` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/main/skills/programmatic-seo) | `365b412` | MIT |
| `schema` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/main/skills/schema) | `365b412` | MIT |
| `site-architecture` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/main/skills/site-architecture) | `365b412` | MIT |
| `content-strategy` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/main/skills/content-strategy) | `365b412` | MIT |
| `seo-hreflang` | [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo/tree/main/skills/seo-hreflang) | `4b99de2` | MIT |
| `seo-plan` | [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo/tree/main/skills/seo-plan) | `4b99de2` | MIT |

SEO skills (added 2026-10-16)

- General-purpose SEO knowledge written for any site (many examples are SaaS
  or e-commerce). **The Code Fix's own rules win** wherever they differ:
  `docs/content-guidelines.md` (page-existence test before any new page —
  `programmatic-seo` must not bypass it), `docs/seo-technical-policy.md`
  (title/description limits, redirects, robots/noindex pattern) and
  `docs/seo-strategy.md`.
- For these eight, each SKILL.md was read in full; the reference files were
  scanned for commands, links and embedded instructions (only read-only
  `curl -I` header checks and tool links turned up). The `evals/` folders of
  marketingskills were left out (test data, unused at runtime); each folder
  carries its LICENSE.txt.
- Not added, on purpose: the rest of `claude-seo` (`seo-google`, `seo-drift`,
  `seo-cluster`, …) runs that plugin's Python scripts and needs API
  credentials (Search Console, DataForSEO); worth a separate decision if we
  want live Search Console data. Overlapping skills were taken from one source
  only (`seo-audit`, `schema`, `programmatic-seo` from marketingskills).
- Cross-references to skills that are not vendored (`cro`, `copywriting`,
  `competitors`, `analytics`, …) are harmless pointers.

Notes

- `turborepo` deliberately points at the docs bundled in the installed
  `turbo` package (`node_modules/turbo/docs/README.md`), so it always matches
  the version in `package-lock.json`.
- `next-dev-loop` requires Next.js 16.3+ (V2 is on 16.3.8).
- Next.js reference knowledge ships with the framework itself in
  `node_modules/next/dist/docs/` — see the root `AGENTS.md`.
- No official Drizzle skill exists; use the Drizzle docs and
  `packages/db/README.md`.

Project-owned skills (written for this repo): `project-map`, `audit-*`,
`v1-*` mappers, and the `v2-*` skills described in `docs/v2/README.md`.
