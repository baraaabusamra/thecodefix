---
name: v1-seo-mapper
description: Map The Code Fix V1 SEO behavior across route metadata, canonical URLs, robots, sitemap, structured data, internal linking, keyword tracking, and SEO validation.
---

# V1 SEO Mapper

## Purpose

Explain the SEO system as implemented, separating generated metadata and heuristics from real search-performance data.

## Procedure

1. Trace metadata construction for each route family, including title, description, canonical, robots, Open Graph, and structured data where present.
2. Inspect sitemap, robots, redirects, canonical rules, indexability, pagination, noindex policies, and URL normalization.
3. Trace internal linking: navigation, related content, breadcrumbs, prerequisites, orphan checks, and broken-link validation.
4. Map keyword helpers, keyword registry/tracker, admin pages/actions, database persistence, and any provider integrations.
5. Inspect SEO-specific scripts and tests; document exact matching scope, normalization, thresholds, and false-positive risk.
6. Search for analytics/Search Console/provider adapters, but never assume credentials or data access exists.
7. Identify differences between intended policy documents and executable code.
8. Produce `docs/repository-audit/seo-map.md`.

## Required distinctions

- Generated phrase vs researched keyword.
- Exact collision vs near-duplicate vs semantic cannibalization.
- Indexability configuration vs actual indexing.
- Manually entered rank vs provider-sourced impressions/clicks/position.
- Automated structural pass vs editorial/search-intent quality.

## Output

Metadata flow diagram, route-family matrix, keyword data lineage, link graph/checks, sitemap/robots rules, policy-to-code gaps, evidence-backed recommendations, and open questions.

## Guardrails

- Never invent search volume, traffic, rankings, impressions, or clicks.
- Do not recommend mass-producing pages to target keyword variants.
- Do not change canonical/indexability rules during mapping.
- Keep every finding tied to a file/symbol and confidence level.
