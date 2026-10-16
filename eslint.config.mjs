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
    // Launch-film source (HyperFrames composition, browser globals, its own
    // tooling) — isolated from the Next.js app.
    "deliverables/**",
  ]),
]);

export default eslintConfig;
