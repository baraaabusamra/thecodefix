import test, { mock } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { sourceRoots } from "./helpers/source-roots.mjs";

// Phase 0: every creator write path must use the shared http(s)-only URL
// schema — z.string().url() alone accepts javascript:/data: URIs.

const writes = [];
mock.module("@tcf/identity/auth", { exports: { auth: async () => ({ user: { id: "u1" } }) } });
mock.module("@tcf/core/rate-limit", { exports: { rateLimit: () => true, getClientIp: async () => "t" } });
mock.module("@tcf/creators/creators", {
  exports: {
    getPost: async () => ({ id: "p1", creatorId: "c1" }),
    getCreator: async () => ({ id: "c1", userId: "u1" }),
    updatePostContent: async (id, data) => {
      writes.push(data);
      return {};
    },
  },
});
mock.module("next/navigation", {
  exports: {
    redirect: (to) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { to });
    },
  },
});

const { updateOwnPost } = await import("../modules/creators/src/actions/edit-post.ts");

function fd(fields) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ title: "Title", body: "Body text", ...fields })) f.set(k, v);
  return f;
}

for (const bad of [
  "javascript:alert(1)",
  "JavaScript:alert(document.cookie)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
]) {
  test(`updateOwnPost rejects unsafe URL: ${bad}`, async () => {
    writes.length = 0;
    for (const field of ["link", "imageUrl"]) {
      const res = await updateOwnPost("p1", { success: false, message: "" }, fd({ [field]: bad }));
      assert.equal(res.success, false, field);
      assert.ok(res.errors?.[field], `${field} should carry a validation error`);
    }
    assert.equal(writes.length, 0);
  });
}

test("updateOwnPost still accepts https URLs and empty values", async () => {
  writes.length = 0;
  await assert.rejects(
    updateOwnPost("p1", { success: false, message: "" }, fd({ link: "https://youtu.be/x", imageUrl: "" })),
    (e) => e.message === "NEXT_REDIRECT"
  );
  assert.deepStrictEqual(writes[0].link, "https://youtu.be/x");
  assert.equal(writes[0].imageUrl, null);
});

test("no creator/public write path uses bare z.string().url()", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && /z\s*\.\s*string\(\)\s*\.\s*url\(/.test(fs.readFileSync(p, "utf8"))) {
        offenders.push(p);
      }
    }
  };
  // Write paths = routes (apps/web) + every module's Server Actions and UI.
  // V1 scanned src/app + src/components; packages/core/src/validation.ts is
  // where the safe schema itself is defined, so it is out of scope as before.
  walk(path.join(process.cwd(), "apps", "web", "src", "app"));
  for (const root of sourceRoots().filter((r) => r.startsWith("modules/"))) {
    for (const sub of ["actions", "ui"]) {
      const dir = path.join(process.cwd(), root, sub);
      if (fs.existsSync(dir)) walk(dir);
    }
  }
  assert.deepStrictEqual(offenders, []);
});
