import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // V2 monorepo: the Next.js app lives in apps/web.
  { settings: { next: { rootDir: "apps/web/" } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Nested .next build output inside any git worktree checkout (e.g.
    // .claude/worktrees/agent-*/.next) — the root-only ".next/**" above
    // doesn't match these since they're not at the repo root.
    "**/.next/**",
    // Isolated agent worktrees are separate working copies of the repo,
    // not part of this one — never lint their contents from here.
    ".claude/worktrees/**",
    // Local agent runtimes, generated audit artifacts, and one-off scratch
    // scripts are not application source and may use their own lint rules.
    ".agents/**",
    ".claude/**",
    ".claude-flow/**",
    ".codex/**",
    ".swarm/**",
    "reports/**",
    "scratch_*.{js,cjs,mjs}",
    "thecodefix_youtube_slide/**",
    // V2: content trees are data, archived V1 code is not compiled.
    "content/**",
    "archive/**",
    "audit-out/**",
    "docs/project-map/map-data.js",
  ]),
]);

export default eslintConfig;
