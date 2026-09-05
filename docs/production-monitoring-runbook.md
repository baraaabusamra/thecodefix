# Production monitoring runbook

**Status:** code complete locally on 2026-09-05. Production alerting is active
only after `ERROR_ALERT_WEBHOOK_URL` is configured in the hosting environment.

## What is captured

- Uncaught Server Component, Route Handler, Server Action, and rendering errors
  through Next.js `src/instrumentation.ts`.
- Public, admin, and root-layout error boundaries through the size-limited and
  rate-limited `/api/monitoring/client-error` collector.
- Stripe Checkout and webhook failures that are caught and converted into HTTP
  responses (and therefore would not reach `onRequestError`).
- CSP violations through `/api/csp-report`. These are warning logs only and do
  not page the alert webhook.

Payloads exclude request headers, cookies, raw form bodies, user code, and client
error messages. Known email, bearer-token, URL-credential, secret-assignment,
and sensitive-query patterns are redacted. Request and document URLs are reduced
to paths or stripped of query strings.

## Required production setup

1. Create a private Slack incoming webhook, Discord webhook, or HTTPS endpoint
   owned by the operations team.
2. Set `ERROR_ALERT_WEBHOOK_URL` as a server-only production secret. Never use a
   `NEXT_PUBLIC_` prefix.
3. For a custom receiver requiring bearer authentication, also set
   `ERROR_ALERT_WEBHOOK_TOKEN`.
4. Deploy to preview first and trigger one controlled server error. Confirm:
   - the page shows the Arabic fallback and a reference digest when available;
   - the structured `[monitoring]` record appears in hosting logs;
   - one alert reaches the configured destination;
   - repeated identical errors within five minutes do not generate repeated
     alerts from the same runtime instance.
5. Configure the hosting provider to retain production logs and alert on a
   sustained rise in `[monitoring]` `server_error` events. The webhook is the
   immediate signal; the provider log alert covers multi-instance trends.

## CSP rollout

The shipped header is `Content-Security-Policy-Report-Only`, so it observes but
does not block resources. Keep it in this mode for at least one to two weeks and
exercise the homepage, OAuth, pricing/Stripe redirect, lessons, all playground
modes, certificates, and admin pages.

Review `csp_violation` records for unexpected domains. Before enforcement, make
an explicit decision documented in `docs/phase-0-security-hardening-audit.md`
between static generation with `unsafe-inline`, dynamic request nonces, or the
experimental Next.js SRI path. Also explicitly accept or isolate the playground's
`unsafe-eval` / `wasm-unsafe-eval` requirement.

## Rollback

- Disable alert delivery by removing `ERROR_ALERT_WEBHOOK_URL`; structured logs
  continue locally in the hosting runtime.
- Remove the two CSP response headers from `next.config.ts` to stop report
  collection. Report-Only never blocks page resources.
- If a collector is abused, remove its route or temporarily lower its existing
  per-IP limit; both collectors reject unsupported content types and oversized
  streaming bodies before parsing.
