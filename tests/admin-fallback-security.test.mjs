import test, { mock } from "node:test";
import assert from "node:assert";

// Phase 0: a broken/missing auth configuration in production must never turn
// per-user RBAC into a shared owner password.

const STRONG = "s".repeat(40);
let jar = new Map();
let authEnabled = false;
let dbEnabled = true;

mock.module("next/headers", {
  exports: {
    cookies: async () => ({
      get: (name) => (jar.has(name) ? { name, value: jar.get(name).value } : undefined),
      set: (name, value, options) => jar.set(name, { value, options }),
      delete: (name) => jar.delete(name),
    }),
    headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
  },
});
mock.module("@/auth", { exports: { auth: async () => null } });
mock.module("@/db", { exports: { isDbEnabled: () => dbEnabled, db: null } });
mock.module("@/lib/flags", { exports: { isAuthEnabled: () => authEnabled } });
mock.module("next/navigation", {
  exports: {
    redirect: (to) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { to });
    },
  },
});

const token = await import("../src/lib/admin-token.ts");
const { resolveAdmin, ADMIN_COOKIE } = await import("../src/lib/admin-access.ts");
const { submitAdminKey } = await import("../src/app/admin/actions.ts");

const ENV_KEYS = ["NODE_ENV", "ADMIN_TOKEN", "ADMIN_TOKEN_MODE"];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
function setEnv(env) {
  for (const k of ENV_KEYS) {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  jar = new Map();
  authEnabled = false; // RBAC unavailable: e.g. OAuth vars / AUTH_SECRET missing
  dbEnabled = true;
}
test.after(() => setEnv(saved));

async function submit(key) {
  const fd = new FormData();
  fd.set("key", key);
  try {
    await submitAdminKey(fd);
  } catch (e) {
    return e.to;
  }
}

test("policy: token mode is off in production unless explicitly enabled with a strong token", () => {
  const P = { NODE_ENV: "production" };
  assert.equal(token.adminTokenModeAllowed({ ...P }), false);
  assert.equal(token.adminTokenModeAllowed({ ...P, ADMIN_TOKEN: STRONG }), false);
  assert.equal(token.adminTokenModeAllowed({ ...P, ADMIN_TOKEN: "short", ADMIN_TOKEN_MODE: "true" }), false);
  assert.equal(token.adminTokenModeAllowed({ ...P, ADMIN_TOKEN: STRONG, ADMIN_TOKEN_MODE: "false" }), false);
  assert.equal(token.adminTokenModeAllowed({ ...P, ADMIN_TOKEN: STRONG, ADMIN_TOKEN_MODE: "true" }), true);
  // Development convenience is unchanged.
  assert.equal(token.adminTokenModeAllowed({ NODE_ENV: "development", ADMIN_TOKEN: "x" }), true);
});

test("production + broken RBAC config + ADMIN_TOKEN set: NO owner access (fail closed)", async () => {
  setEnv({ NODE_ENV: "production", ADMIN_TOKEN: STRONG });
  // Even a cookie carrying the raw token (the old cookie format) is refused.
  jar.set(ADMIN_COOKIE, { value: STRONG });
  const access = await resolveAdmin();
  assert.equal(access.ok, false);
  assert.equal(access.reason, "disabled");
});

test("production + broken RBAC config + no token: NO owner access", async () => {
  setEnv({ NODE_ENV: "production" });
  const access = await resolveAdmin();
  assert.equal(access.ok, false);
});

test("production + auth on but DATABASE_URL missing: still fails closed", async () => {
  setEnv({ NODE_ENV: "production", ADMIN_TOKEN: STRONG });
  authEnabled = true;
  dbEnabled = false;
  assert.equal((await resolveAdmin()).ok, false);
});

test("production: submitAdminKey is not a password oracle when token mode is off", async () => {
  setEnv({ NODE_ENV: "production", ADMIN_TOKEN: STRONG });
  assert.equal(await submit(STRONG), "/admin?denied=1");
  assert.equal(jar.has(ADMIN_COOKIE), false);
});

test("emergency mode: correct key yields an HMAC session cookie (never the raw token)", async () => {
  setEnv({ NODE_ENV: "production", ADMIN_TOKEN: STRONG, ADMIN_TOKEN_MODE: "true" });
  assert.equal(await submit(STRONG), "/admin");
  const cookie = jar.get(ADMIN_COOKIE);
  assert.ok(cookie);
  assert.ok(!cookie.value.includes(STRONG));
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.secure, true);
  assert.equal(cookie.options.sameSite, "strict");
  const access = await resolveAdmin();
  assert.equal(access.ok, true);
  assert.equal(access.role, "owner");
});

test("emergency mode: wrong key and raw-token cookies are rejected", async () => {
  setEnv({ NODE_ENV: "production", ADMIN_TOKEN: STRONG, ADMIN_TOKEN_MODE: "true" });
  assert.equal(await submit("wrong"), "/admin?denied=1");
  jar.set(ADMIN_COOKIE, { value: STRONG });
  assert.equal((await resolveAdmin()).ok, false);
});

test("submitAdminKey is rate limited (even the right key is refused once over the limit)", async () => {
  setEnv({ NODE_ENV: "production", ADMIN_TOKEN: STRONG, ADMIN_TOKEN_MODE: "true" });
  // 1 success + 1 failure already spent this IP's budget above; burn the rest.
  for (let i = 0; i < 5; i++) await submit("wrong");
  assert.equal(await submit(STRONG), "/admin?denied=1");
  assert.equal(jar.has(ADMIN_COOKIE), false);
});

test("session value: expires, can't be extended, and is bound to the token", () => {
  const now = 1_000_000_000_000;
  const v = token.createAdminSessionValue(STRONG, now);
  assert.equal(token.verifyAdminSessionValue(v, STRONG, now + 1000), true);
  assert.equal(token.verifyAdminSessionValue(v, STRONG, now + token.ADMIN_SESSION_MS + 1), false);
  assert.equal(token.verifyAdminSessionValue(v, "t".repeat(40), now + 1000), false); // rotated token
  const [, , mac] = v.split(".");
  const farFuture = now + 10 * token.ADMIN_SESSION_MS;
  assert.equal(token.verifyAdminSessionValue(`v1.${farFuture}.${mac}`, STRONG, now), false);
  assert.equal(token.verifyAdminSessionValue("v1.x.y", STRONG, now), false);
  assert.equal(token.verifyAdminSessionValue(undefined, STRONG, now), false);
});

test("development convenience is preserved", async () => {
  setEnv({ NODE_ENV: "development" });
  assert.equal((await resolveAdmin()).ok, true); // no token: open (local setup only)
  setEnv({ NODE_ENV: "development", ADMIN_TOKEN: "dev" });
  assert.equal((await resolveAdmin()).ok, false); // token set: needs the key
});
