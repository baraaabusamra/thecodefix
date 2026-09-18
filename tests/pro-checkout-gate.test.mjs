import test, { mock } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// Phase 0: nothing in the app enforces a Pro entitlement, so no customer may
// be charged for Pro until something does.

const created = [];
mock.module("@/lib/stripe", {
  exports: {
    getStripe: () => ({
      checkout: {
        sessions: {
          create: async (args) => {
            created.push(args);
            return { url: "https://checkout.stripe.test/x" };
          },
        },
      },
    }),
  },
});
mock.module("@/auth", {
  exports: { auth: async () => ({ user: { id: "u1", email: "u@example.com" } }) },
});
mock.module("@/lib/rate-limit", { exports: { rateLimit: () => true, getClientIp: async () => "t" } });
mock.module("@/lib/monitoring", { exports: { captureServerError: async () => "id" } });

// Fully configured Stripe + auth: the gate must hold even so.
Object.assign(process.env, {
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_PRO_PRICE_ID: "price_x",
  AUTH_SECRET: "s",
  AUTH_GITHUB_ID: "g",
});

const flags = await import("../src/lib/flags.ts");
const { POST } = await import("../src/app/api/checkout/route.ts");

test("keys configured but no enforced Pro feature → payments stay closed", () => {
  assert.equal(flags.hasStripeKeys(), true);
  assert.deepStrictEqual([...flags.ENFORCED_PRO_FEATURES], []);
  assert.equal(flags.isPaymentsEnabled(), false);
});

test("POST /api/checkout refuses server-side and never creates a Stripe session", async () => {
  const res = await POST();
  assert.equal(res.status, 503);
  assert.equal(created.length, 0);
});

test("the pricing page makes no Pro-only claims the code doesn't enforce", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");
  for (const claim of ["شهادات إتمام", "اختبارات متقدمة", "بدون إعلانات", "تحميل المشاريع الكاملة"]) {
    assert.ok(!src.includes(claim), claim);
  }
});

test("invariant: checkout can only reopen together with a real entitlement check", () => {
  // If someone lists an enforced Pro feature, some application code other
  // than the webhook / admin billing view must actually read subscriptions.
  if (flags.ENFORCED_PRO_FEATURES.length === 0) return;
  const readers = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && /from\(subscriptions\)/.test(fs.readFileSync(p, "utf8"))) {
        readers.push(p.replaceAll("\\", "/"));
      }
    }
  };
  walk(path.join(process.cwd(), "src"));
  const entitlementReaders = readers.filter(
    (p) => !p.endsWith("src/lib/admin-billing.ts") && !p.includes("api/stripe/webhook")
  );
  assert.ok(entitlementReaders.length > 0, "ENFORCED_PRO_FEATURES is set but nothing reads subscriptions");
});
