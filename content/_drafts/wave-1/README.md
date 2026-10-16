# Wave 1 — Production-ready drafts (UNPUBLISHED)

These are **production-ready but unpublished** lesson pages from the Wave 1 pilot batch. They are
staged here — **not** in `src/content/tracks/` — on purpose:

- `src/lib/content.ts` auto-discovers every directory under `src/content/tracks/` and renders it
  live. Dropping these there would **publish them automatically** and **bypass the
  `create-new-track` process** the governance requires for any new track.
- The intended production path for new content is the **admin CMS** (DB-backed `contentLessons`
  with a `draft → review → published` editorial status), where **publishing is a separate
  managerial action** (`ops:manage`, per `docs/ops-two-tier-design.md`).

So per the batch rule ("if publication requires a separate step, leave them production-ready but
unpublished"), these files sit here until a human runs `create-new-track` (or imports them via the
CMS) and publishes them.

Each subdirectory mirrors its intended live path exactly, so promotion is a move + register:

| Draft file | Intended live URL |
|---|---|
| `ai-ml/00-intro.mdx` | `/learn/ai-ml/00-intro` |
| `software-testing/00-intro.mdx` | `/learn/software-testing/00-intro` |
| `terraform/00-intro.mdx` | `/learn/terraform/00-intro` |

`_meta.json` in each folder is the track descriptor to use when the track is created. `order` values
are provisional (finalized at `create-new-track` time).

Report: [`docs/wave-1-batch-001-report.md`](../../docs/wave-1-batch-001-report.md).
