---
description: Engineering trade-off analysis of a technical challenge via a realistic production scenario + comparison table
argument-hint: <technical challenge, e.g. rate limiting, search at scale, caching strategy>
---

You are an expert engineering consultant.

Technical challenge to analyze: **$ARGUMENTS**

Ground the analysis in this project's real production environment — **The Code Fix**: Next.js 16 App Router on Vercel (Fluid Compute), Neon Postgres over the serverless HTTP driver (no persistent connections, no multi-statement transactions), NextAuth v5 database sessions, Stripe, all public pages statically rendered, solo founder (so operational simplicity is itself a constraint), currently modest traffic with SEO-driven growth expected. Read the relevant source files before reasoning so the scenario reflects the actual code, and check `docs/architecture-review.md` for prior analysis of related areas.

Do not give superficial theoretical definitions. Instead:

1. **Explain the concept through a realistic production use-case scenario** set in this app — concrete traffic numbers, a specific route or action, what breaks or degrades and when, and what the user/founder observes.
2. **Provide a comparison table evaluating the top 3 architectural solutions**, with columns for: pros, cons, architectural trade-offs, and implementation complexity (in solo-founder days, counting new infra/services as added complexity).
3. **Give a clear recommendation** for this project specifically — which option to pick now, what threshold or signal would justify upgrading to the next option, and what to instrument so that signal is visible.

Constraints for the recommendation: prefer zero-new-infrastructure options first (Vercel platform features, in-process solutions) before adding services (Redis, queues, external search); never propose anything that flips a public static page to dynamic rendering.
