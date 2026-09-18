import test, { mock } from "node:test";
import assert from "node:assert";
import Stripe from "stripe";
import { createTestDb, dbModuleExports, createUser } from "./helpers/pglite.mjs";

// Stripe webhook state integrity, exercised through the real route with real
// Stripe signature verification against a real Postgres (PGlite) database.
// Only Stripe's API (subscriptions.retrieve) is simulated.

const SECRET = "whsec_test_secret";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

const { db, schema } = await createTestDb();

// A db proxy whose queries can be made to fail, to simulate an outage.
let dbDown = false;
const flakyDb = new Proxy(db, {
  get(target, prop) {
    if (dbDown && ["select", "insert", "update", "delete"].includes(prop)) {
      return () => {
        throw new Error("connection terminated unexpectedly");
      };
    }
    const value = Reflect.get(target, prop);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
mock.module("@/db", { exports: { ...dbModuleExports(db), db: flakyDb, requireDb: () => flakyDb } });

// Simulated Stripe API: current (canonical) subscription objects by id.
const stripeState = new Map();
let retrieveCalls = 0;
const fetcher = {
  retrieve: async (id) => {
    retrieveCalls++;
    const s = stripeState.get(id);
    if (!s) throw Object.assign(new Error("No such subscription"), { code: "resource_missing" });
    return structuredClone(s);
  },
};
const realStripe = new Stripe("sk_test_dummy");
mock.module("@/lib/stripe", {
  exports: { getStripe: () => ({ webhooks: realStripe.webhooks, subscriptions: fetcher }) },
});
const alerts = [];
mock.module("@/lib/monitoring", {
  exports: { captureServerError: async (err, ctx) => alerts.push(ctx?.operation) },
});

const { POST } = await import("../src/app/api/stripe/webhook/route.ts");
const { upsertCanonicalSubscription } = await import("../src/lib/stripe-sync.ts");
const { eq } = await import("drizzle-orm");

let seq = 0;
function sub(id, status, userId, periodEnd = 1_900_000_000) {
  return {
    id,
    object: "subscription",
    status,
    customer: "cus_1",
    metadata: userId ? { userId } : {},
    items: { data: [{ current_period_end: periodEnd }] },
  };
}
function event(type, object, created = 1_700_000_000 + ++seq) {
  return { id: `evt_${++seq}`, object: "event", type, created, data: { object } };
}
async function deliver(evt, { badSignature = false } = {}) {
  const payload = JSON.stringify(evt);
  const header = badSignature
    ? "t=1,v1=0000"
    : realStripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  const res = await POST(
    new Request("http://test/api/stripe/webhook", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": header },
    })
  );
  return { status: res.status, body: await res.json() };
}
async function rowFor(subId) {
  const [row] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.stripeSubscriptionId, subId));
  return row;
}

test("1. duplicate delivery of the same event is processed once", async () => {
  const userId = await createUser(db);
  stripeState.set("sub_dup", sub("sub_dup", "active", userId));
  const evt = event("customer.subscription.created", sub("sub_dup", "active", userId));
  retrieveCalls = 0;
  assert.equal((await deliver(evt)).body.outcome, "processed");
  assert.equal((await deliver(evt)).body.outcome, "duplicate");
  assert.equal(retrieveCalls, 1);
  const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.stripeSubscriptionId, "sub_dup"));
  assert.equal(rows.length, 1);
});

test("2. updated → deleted ends canceled", async () => {
  const userId = await createUser(db);
  stripeState.set("sub_ud", sub("sub_ud", "active", userId));
  await deliver(event("customer.subscription.updated", sub("sub_ud", "active", userId)));
  assert.equal((await rowFor("sub_ud")).status, "active");
  stripeState.set("sub_ud", sub("sub_ud", "canceled", userId));
  await deliver(event("customer.subscription.deleted", sub("sub_ud", "canceled", userId)));
  assert.equal((await rowFor("sub_ud")).status, "canceled");
});

test("3. deleted → delayed stale 'updated(active)' never resurrects access", async () => {
  const userId = await createUser(db);
  stripeState.set("sub_stale", sub("sub_stale", "canceled", userId));
  await deliver(event("customer.subscription.deleted", sub("sub_stale", "canceled", userId), 2_000));
  // An OLDER update event (payload says active) arrives late: the payload is
  // ignored in favour of Stripe's canonical state.
  await deliver(event("customer.subscription.updated", sub("sub_stale", "active", userId), 1_000));
  assert.equal((await rowFor("sub_stale")).status, "canceled");
  // Even if a stale fetch claimed "active", canceled is terminal in the DB.
  stripeState.set("sub_stale", sub("sub_stale", "active", userId));
  await deliver(event("customer.subscription.updated", sub("sub_stale", "active", userId)));
  assert.equal((await rowFor("sub_stale")).status, "canceled");
});

test("3b. an in-flight write with an older Stripe fetch cannot overwrite newer state", async () => {
  const userId = await createUser(db);
  const base = { userId, stripeSubscriptionId: "sub_race", stripeCustomerId: "cus_1", currentPeriodEnd: null };
  assert.equal(await upsertCanonicalSubscription(db, { ...base, status: "past_due", syncedAt: new Date(2_000) }), true);
  assert.equal(await upsertCanonicalSubscription(db, { ...base, status: "active", syncedAt: new Date(1_000) }), false);
  assert.equal((await rowFor("sub_race")).status, "past_due");
});

test("4. checkout.session.completed replay creates one subscription row", async () => {
  const userId = await createUser(db);
  stripeState.set("sub_co", sub("sub_co", "active", userId));
  const session = {
    id: "cs_1",
    object: "checkout.session",
    mode: "subscription",
    subscription: "sub_co",
    client_reference_id: userId,
    metadata: { userId },
  };
  await deliver(event("checkout.session.completed", session));
  await deliver(event("checkout.session.completed", session)); // replay, new event id
  await deliver(event("customer.subscription.created", sub("sub_co", "active", userId)));
  const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "active");
});

test("5. missing or invalid user mapping never creates an orphan row", async () => {
  stripeState.set("sub_nouser", sub("sub_nouser", "active", null));
  const r1 = await deliver(event("customer.subscription.created", sub("sub_nouser", "active", null)));
  assert.equal(r1.status, 200);
  assert.equal(r1.body.outcome, "unmapped");
  assert.equal(await rowFor("sub_nouser"), undefined);

  stripeState.set("sub_ghost", sub("sub_ghost", "active", "user-that-does-not-exist"));
  const r2 = await deliver(event("customer.subscription.created", sub("sub_ghost", "active", "x")));
  assert.equal(r2.body.outcome, "unmapped");
  assert.equal(await rowFor("sub_ghost"), undefined);
  assert.ok(alerts.includes("map_subscription"));
});

test("5b. an existing row is never re-assigned to a different user", async () => {
  const owner = await createUser(db);
  const other = await createUser(db);
  stripeState.set("sub_own", sub("sub_own", "active", owner));
  await deliver(event("customer.subscription.created", sub("sub_own", "active", owner)));
  stripeState.set("sub_own", sub("sub_own", "active", other)); // metadata tampered later
  await deliver(event("customer.subscription.updated", sub("sub_own", "active", other)));
  assert.equal((await rowFor("sub_own")).userId, owner);
});

test("6. invalid signature is rejected with 400 and nothing is written", async () => {
  const userId = await createUser(db);
  stripeState.set("sub_sig", sub("sub_sig", "active", userId));
  const res = await deliver(event("customer.subscription.created", sub("sub_sig", "active", userId)), { badSignature: true });
  assert.equal(res.status, 400);
  assert.equal(await rowFor("sub_sig"), undefined);
});

test("7. database failure returns 500 and the event is retried successfully later", async () => {
  const userId = await createUser(db);
  stripeState.set("sub_dbfail", sub("sub_dbfail", "active", userId));
  const evt = event("customer.subscription.created", sub("sub_dbfail", "active", userId));
  dbDown = true;
  const failed = await deliver(evt);
  dbDown = false;
  assert.equal(failed.status, 500);
  // Not marked processed → Stripe's retry of the SAME event is handled.
  const retried = await deliver(evt);
  assert.equal(retried.body.outcome, "processed");
  assert.equal((await rowFor("sub_dbfail")).status, "active");
});

test("8. legitimate update (past_due → active, new period) is applied", async () => {
  const userId = await createUser(db);
  stripeState.set("sub_ok", sub("sub_ok", "past_due", userId, 1_800_000_000));
  await deliver(event("customer.subscription.updated", sub("sub_ok", "past_due", userId)));
  assert.equal((await rowFor("sub_ok")).status, "past_due");
  stripeState.set("sub_ok", sub("sub_ok", "active", userId, 1_900_000_000));
  await deliver(event("customer.subscription.updated", sub("sub_ok", "active", userId)));
  const row = await rowFor("sub_ok");
  assert.equal(row.status, "active");
  assert.equal(row.currentPeriodEnd.getTime(), 1_900_000_000 * 1000);
});

test("irrelevant event types are acknowledged and recorded, not processed", async () => {
  const res = await deliver(event("invoice.paid", { id: "in_1", object: "invoice" }));
  assert.equal(res.body.outcome, "ignored");
});

test("checkout guard: a live subscription blocks a second checkout; the Stripe customer is reused", async () => {
  const { getCheckoutState } = await import("../src/lib/stripe-sync.ts");
  const userId = await createUser(db);
  assert.deepStrictEqual(await getCheckoutState(db, userId), { hasLiveSubscription: false, customerId: null });

  stripeState.set("sub_live", { ...sub("sub_live", "active", userId), customer: "cus_live" });
  await deliver(event("customer.subscription.created", stripeState.get("sub_live")));
  assert.deepStrictEqual(await getCheckoutState(db, userId), { hasLiveSubscription: true, customerId: "cus_live" });

  stripeState.set("sub_live", { ...sub("sub_live", "canceled", userId), customer: "cus_live" });
  await deliver(event("customer.subscription.deleted", stripeState.get("sub_live")));
  // Canceled: a new checkout is allowed, and it reuses the same customer.
  assert.deepStrictEqual(await getCheckoutState(db, userId), { hasLiveSubscription: false, customerId: "cus_live" });
});
