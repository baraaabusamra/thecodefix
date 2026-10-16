import test, { mock } from "node:test";
import assert from "node:assert";
import { PgDialect } from "drizzle-orm/pg-core";

// Phase 0: writers (content:edit) draft and submit for review; only
// content:publish (operations/admin/owner) can make CMS content live, take it
// down, or touch live pages. Exercised through the real Server Actions with
// the real RBAC table — only the DB and framework plumbing are faked.

const dialect = new PgDialect();
const whereSql = (cond) => (cond ? dialect.sqlToQuery(cond).sql : "");

let role = "writer";
let currentRow = null; // what the "SELECT current" lookup returns
let mutationResult = []; // what UPDATE/DELETE ... RETURNING yields
const calls = [];

function selectChain() {
  return {
    from: () => ({
      where: () => ({ limit: async () => (currentRow ? [currentRow] : []) }),
    }),
  };
}
const fakeDb = {
  select: () => selectChain(),
  insert: (table) => ({
    values: (values) => {
      calls.push({ op: "insert", table, values });
      const chain = {
        onConflictDoNothing: () => chain,
        returning: async () => [{ id: "new-id" }],
        then: (r) => Promise.resolve(undefined).then(r),
      };
      return chain;
    },
  }),
  update: () => ({
    set: (values) => ({
      where: (cond) => {
        calls.push({ op: "update", values, where: whereSql(cond) });
        const chain = {
          returning: async () => mutationResult,
          then: (r) => Promise.resolve(undefined).then(r),
        };
        return chain;
      },
    }),
  }),
  delete: () => ({
    where: (cond) => {
      calls.push({ op: "delete", where: whereSql(cond) });
      const chain = {
        returning: async () => mutationResult,
        then: (r) => Promise.resolve(undefined).then(r),
      };
      return chain;
    },
  }),
};

mock.module("@tcf/db", { exports: { db: fakeDb, requireDb: () => fakeDb, isDbEnabled: () => true } });
mock.module("@tcf/identity/admin-access", {
  exports: { resolveAdmin: async () => ({ ok: true, mode: "rbac", role }) },
});
mock.module("@tcf/identity/auth", { exports: { auth: async () => ({ user: { id: "u1" } }) } });
mock.module("@tcf/content/mdx-untrusted", { exports: { validateUntrustedMdx: async () => [] } });
mock.module("next/cache", { exports: { revalidatePath: () => {}, updateTag: () => {} } });
mock.module("next/navigation", {
  exports: {
    redirect: (to) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { to });
    },
  },
});

const { can } = await import("../packages/identity/src/rbac.ts");
const actions = await import("../modules/admin/src/actions/content.ts");
const { setLessonWorkflow } = await import("../modules/admin/src/actions/ops-content.ts");

function form(fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
async function runAction(fn, fields) {
  try {
    await fn(form(fields));
    return { redirect: null };
  } catch (e) {
    if (e.message === "NEXT_REDIRECT") return { redirect: e.to };
    return { error: e.message };
  }
}
function reset({ asRole, row = null, result = [{ track: "python", slug: "x" }] }) {
  role = asRole;
  currentRow = row;
  mutationResult = result;
  calls.length = 0;
}
const draftRow = { status: "draft", published: false };
const liveRow = { status: "published", published: true };
const lessonFields = { id: "L1", title: "T", content: "# T", order: "1" };

test("RBAC table: content:publish is held by operations/admin/owner, never writer", () => {
  assert.equal(can("writer", "content:edit"), true);
  assert.equal(can("writer", "content:publish"), false);
  for (const r of ["operations", "admin", "owner"]) assert.equal(can(r, "content:publish"), true, r);
  for (const r of ["student", "creator", "support", "sales", "marketing", "designer"]) {
    assert.equal(can(r, "content:publish"), false, r);
  }
});

test("writer: ticking 'published' on a draft does NOT publish it", async () => {
  reset({ asRole: "writer", row: draftRow });
  const res = await runAction(actions.updateDbLesson, { ...lessonFields, published: "on" });
  assert.equal(res.redirect, "/admin/content/db/L1?saved=1");
  const update = calls.find((c) => c.op === "update");
  assert.equal(update.values.published, false);
  assert.equal(update.values.status, "draft");
});

test("writer: can submit a draft for review (still unpublished)", async () => {
  reset({ asRole: "writer", row: draftRow });
  await runAction(actions.updateDbLesson, { ...lessonFields, submitForReview: "on", published: "on" });
  const update = calls.find((c) => c.op === "update");
  assert.equal(update.values.published, false);
  assert.equal(update.values.status, "review");
});

test("writer: the UPDATE itself is guarded (no race with a concurrent publish)", async () => {
  reset({ asRole: "writer", row: draftRow });
  await runAction(actions.updateDbLesson, lessonFields);
  const { where } = calls.find((c) => c.op === "update");
  assert.match(where, /"published" = \$/);
  assert.match(where, /"status" in \(/);
});

test("writer: if the guarded UPDATE matches nothing (published meanwhile) it reports locked", async () => {
  reset({ asRole: "writer", row: draftRow, result: [] });
  const res = await runAction(actions.updateDbLesson, lessonFields);
  assert.equal(res.redirect, "/admin/content/db/L1?error=locked");
});

test("writer: cannot edit (or silently unpublish) a live lesson", async () => {
  for (const row of [liveRow, { status: "suspended", published: false }]) {
    reset({ asRole: "writer", row });
    const res = await runAction(actions.updateDbLesson, lessonFields);
    assert.equal(res.redirect, "/admin/content/db/L1?error=locked");
    assert.equal(calls.filter((c) => c.op === "update").length, 0);
  }
});

test("writer: a new lesson starts as an unpublished draft", async () => {
  reset({ asRole: "writer" });
  await runAction(actions.createLesson, { track: "python", title: "New", slug: "new" });
  const insert = calls.find((c) => c.op === "insert");
  assert.equal(insert.values.published, false);
  assert.equal(insert.values.status, "draft");
});

test("writer: cannot create or delete tracks (tracks are live immediately)", async () => {
  reset({ asRole: "writer" });
  assert.equal((await runAction(actions.createTrack, { slug: "ruby", title: "Ruby" })).error, "Forbidden");
  assert.equal((await runAction(actions.deleteTrack, { slug: "ruby" })).error, "Forbidden");
  assert.equal(calls.length, 0);
});

test("writer: delete is limited to unpublished drafts/reviews, atomically", async () => {
  reset({ asRole: "writer", result: [] }); // guarded DELETE matched nothing (live row)
  assert.equal((await runAction(actions.deleteDbLesson, { id: "L1" })).error, "Forbidden");
  const { where } = calls.find((c) => c.op === "delete");
  assert.match(where, /"published" = \$/);
  assert.match(where, /"status" in \(/);
});

test("writer: cannot use the operations workflow to publish or suspend", async () => {
  reset({ asRole: "writer" });
  const res = await runAction(setLessonWorkflow, { id: "L1", status: "published" });
  assert.equal(res.error, "Forbidden");
  assert.equal(calls.length, 0);
});

test("admin: publishing works and is not restricted by the writer guard", async () => {
  reset({ asRole: "admin", row: draftRow });
  await runAction(actions.updateDbLesson, { ...lessonFields, published: "on" });
  const update = calls.find((c) => c.op === "update");
  assert.equal(update.values.published, true);
  assert.equal(update.values.status, "published");
  assert.doesNotMatch(update.where, /"status" in/);
});

test("admin: can edit a live lesson and create tracks", async () => {
  reset({ asRole: "admin", row: liveRow });
  const res = await runAction(actions.updateDbLesson, { ...lessonFields, published: "on" });
  assert.equal(res.redirect, "/admin/content/db/L1?saved=1");
  reset({ asRole: "admin" });
  const track = await runAction(actions.createTrack, { slug: "ruby", title: "Ruby" });
  assert.equal(track.redirect, "/admin/content?saved=track");
});

test("operations: can publish through the review workflow", async () => {
  reset({ asRole: "operations" });
  await runAction(setLessonWorkflow, { id: "L1", status: "published" });
  const update = calls.find((c) => c.op === "update");
  assert.equal(update.values.published, true);
  assert.equal(update.values.status, "published");
});
