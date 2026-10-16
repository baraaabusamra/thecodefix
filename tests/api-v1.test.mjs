// /api/v1 — the public content API for the mobile app.
//
// Calls the real route handlers against the real content tree and validates
// every response with the shared @tcf/contracts schemas, so the website and
// the mobile client can never drift apart silently.

import { test, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Outside Next.js: no database, no request headers, no data cache.
mock.module("@tcf/db", { exports: { db: null, isDbEnabled: () => false, requireDb: () => { throw new Error("no db"); } } });
let allowed = true;
mock.module("@tcf/core/rate-limit", { exports: { rateLimit: () => allowed, getClientIp: async () => "203.0.113.7" } });
mock.module("next/cache", { exports: { unstable_cache: (fn) => fn, revalidateTag: () => {}, updateTag: () => {} } });

const contracts = await import("../packages/contracts/src/api-v1.ts");
const tracksRoute = await import("../apps/web/src/app/api/v1/tracks/route.ts");
const trackRoute = await import("../apps/web/src/app/api/v1/tracks/[track]/route.ts");
const lessonRoute = await import("../apps/web/src/app/api/v1/tracks/[track]/lessons/[lesson]/route.ts");

const params = (p) => ({ params: Promise.resolve(p) });
const req = new Request("https://thecodefix.net/api/v1");

test("GET /api/v1/tracks lists every track on disk, matching the contract", async () => {
  const res = await tracksRoute.GET();
  assert.equal(res.status, 200);
  const body = contracts.TracksResponseSchema.parse(await res.json());
  const onDisk = fs.readdirSync("content/ar/tracks").filter((d) => fs.existsSync(`content/ar/tracks/${d}/_meta.json`));
  assert.equal(body.data.length, onDisk.length);
  assert.equal(body.meta.apiVersion, "v1");
  assert.equal(body.meta.locale, "ar");
  const python = body.data.find((t) => t.slug === "python");
  assert.ok(python && python.lessonCount > 10, "python track with its lessons");
  assert.equal(python.url, "/learn/python");
  assert.match(res.headers.get("cache-control"), /s-maxage/);
});

test("GET /api/v1/tracks/:track returns ordered lessons with site URLs", async () => {
  const res = await trackRoute.GET(req, params({ track: "python" }));
  assert.equal(res.status, 200);
  const { data } = contracts.TrackResponseSchema.parse(await res.json());
  assert.ok(data.lessons.length === data.lessonCount);
  const orders = data.lessons.map((l) => l.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  assert.ok(data.lessons.every((l) => l.url === `/learn/python/${l.slug}`));
});

test("GET /api/v1/tracks/:track/lessons/:lesson returns the MDX body and neighbours", async () => {
  const first = (await (await trackRoute.GET(req, params({ track: "python" }))).json()).data.lessons[1];
  const res = await lessonRoute.GET(req, params({ track: "python", lesson: first.slug }));
  assert.equal(res.status, 200);
  const { data } = contracts.LessonResponseSchema.parse(await res.json());
  assert.ok(data.body.length > 50);
  assert.ok(data.previous, "second lesson has a previous lesson");
  assert.equal(data.track, "python");
});

test("unknown track or lesson → 404 with the error contract", async () => {
  for (const res of [
    await trackRoute.GET(req, params({ track: "no-such-track" })),
    await lessonRoute.GET(req, params({ track: "python", lesson: "no-such-lesson" })),
  ]) {
    assert.equal(res.status, 404);
    assert.equal(contracts.ApiErrorSchema.parse(await res.json()).error.code, "not_found");
    assert.equal(res.headers.get("cache-control"), "no-store");
  }
});

test("malformed slugs are rejected before touching the content tree", async () => {
  const res = await trackRoute.GET(req, params({ track: "../../etc" }));
  assert.equal(res.status, 400);
  assert.equal(contracts.ApiErrorSchema.parse(await res.json()).error.code, "bad_request");
});

test("the public API is rate limited", async () => {
  allowed = false;
  try {
    const res = await tracksRoute.GET();
    assert.equal(res.status, 429);
    assert.equal(contracts.ApiErrorSchema.parse(await res.json()).error.code, "rate_limited");
  } finally {
    allowed = true;
  }
});
