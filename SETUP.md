# Activating Auth & Payments

Both features are scaffolded and **dormant** — the site builds and runs with them
off. They light up automatically once you set the env vars (locally in
`.env.local`, or in **Vercel → Settings → Environment Variables**, then redeploy).

The feature flags live in `src/lib/flags.ts`.

---

## 🔐 Auth (Auth.js / NextAuth v5)

Uses JWT sessions — **no database required to start**. A sign-in button appears
in the header automatically once enabled.

1. Generate a secret:
   ```bash
   npx auth secret
   ```
   Set it as `AUTH_SECRET`.
2. Create at least one OAuth app and set its keys:
   - **GitHub:** github.com/settings/developers → New OAuth App.
     Callback URL: `https://YOUR_DOMAIN/api/auth/callback/github`
     → `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
   - **Google:** console.cloud.google.com → Credentials → OAuth client.
     Callback URL: `https://YOUR_DOMAIN/api/auth/callback/google`
     → `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
3. Redeploy. Done — `isAuthEnabled()` flips true, the header shows
   "تسجيل الدخول", and `/api/auth/*` works.

**Files:** `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`,
`src/components/AuthButton.tsx`, `src/components/Providers.tsx`.

### Later: persist users/progress in a DB
Pick a provider (Supabase or Neon Postgres), add a NextAuth adapter, and move
the localStorage progress (`src/lib/progress.ts`) to the DB keyed by user id.

---

## 💳 Payments (Stripe)

1. In Stripe: create a **Product** with a recurring **Price** for Pro.
2. Set env vars:
   - `STRIPE_SECRET_KEY` (Stripe → Developers → API keys)
   - `STRIPE_PRO_PRICE_ID` (the price id, `price_...`)
   - `STRIPE_WEBHOOK_SECRET` (from the webhook below)
3. Create a webhook → endpoint `https://YOUR_DOMAIN/api/stripe/webhook`,
   listening for `checkout.session.completed` and
   `customer.subscription.deleted`. Copy its signing secret.
4. Redeploy. The Pro button on `/pricing` now starts a real Stripe Checkout.

**Files:** `src/lib/stripe.ts`, `src/app/api/checkout/route.ts`,
`src/app/api/stripe/webhook/route.ts`, `src/components/SubscribeButton.tsx`.

### Finishing the loop
The webhook has TODOs to grant/revoke Pro — wire those once a DB + user mapping
exist, then gate Pro-only content (downloads, advanced quizzes) on that flag.

### MENA gateway
For local payments (SAR/EGP) add Moyasar or Paymob alongside Stripe with the
same pattern: a `getX()` lazy client + a checkout route + a webhook.
