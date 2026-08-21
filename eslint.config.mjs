import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
  ]),
]);

export default eslintConfig;
