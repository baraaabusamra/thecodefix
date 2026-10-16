# Third-party skills

These skills are vendored unchanged from their official sources so every
session has them without a network install. Each was read in full before it
was added (no install scripts, no network calls, no instructions outside its
stated scope). Update by re-copying from the source at a newer commit.

| Skill folder | Source | Commit | License |
|---|---|---|---|
| `turborepo` | [vercel/turborepo](https://github.com/vercel/turborepo/tree/main/skills/turborepo) | `74c9fbc` | MIT |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | `063bee9` | MIT |
| `vercel-composition-patterns` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) | `063bee9` | MIT |
| `vercel-react-native-skills` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-native-skills) | `063bee9` | MIT |
| `next-dev-loop` | [vercel/next.js](https://github.com/vercel/next.js/tree/canary/skills/next-dev-loop) | `a6d4c15` | MIT |

Notes

- `turborepo` deliberately points at the docs bundled in the installed
  `turbo` package (`node_modules/turbo/docs/README.md`), so it always matches
  the version in `package-lock.json`.
- `next-dev-loop` requires Next.js 16.3+ (V2 is on 16.4.x).
- Next.js reference knowledge ships with the framework itself in
  `node_modules/next/dist/docs/` — see the root `AGENTS.md`.
- No official Drizzle skill exists; use the Drizzle docs and
  `packages/db/README.md`.

Project-owned skills (written for this repo): `project-map`, `audit-*`,
`v1-*` mappers, and the `v2-*` skills described in `docs/v2/README.md`.
