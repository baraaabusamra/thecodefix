import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

function source(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function assertGuardOrder(file, authMarker, keyMarker, workMarker) {
  const text = source(file);
  assert.match(text, /from "@tcf\/core\/rate-limit"/);
  const auth = text.indexOf(authMarker);
  const guard = text.indexOf(keyMarker);
  const work = text.indexOf(workMarker);
  assert.ok(auth >= 0, `${file}: missing auth marker`);
  assert.ok(guard > auth, `${file}: limiter must run after authentication`);
  assert.ok(work > guard, `${file}: limiter must run before reads/writes or parsing`);
}

test("creator write surfaces rate-limit after auth and before expensive work", () => {
  assertGuardOrder(
    "modules/creators/src/actions/register.ts",
    "if (!userId)",
    "rateLimit(`creator-register:${userId}`",
    "const raw = Object.fromEntries(formData)"
  );
  assertGuardOrder(
    "apps/web/src/app/api/creators/route.ts",
    "if (!session?.user?.id)",
    "rateLimit(`creator-register:${session.user.id}`",
    "const body = await request.json()"
  );
  assertGuardOrder(
    "modules/creators/src/actions/submit.ts",
    "if (!session?.user?.id)",
    "rateLimit(`submit-video:${session.user.id}`",
    "const dbConn = requireDb()"
  );
  assertGuardOrder(
    "modules/creators/src/actions/submissions.ts",
    "if (!session?.user?.id)",
    "rateLimit(`delete-post:${session.user.id}`",
    "const postId = String(formData.get"
  );
  assertGuardOrder(
    "modules/creators/src/actions/edit-post.ts",
    "if (!session?.user?.id)",
    "rateLimit(`edit-post:${session.user.id}`",
    "const post = await getPost(postId)"
  );
  assertGuardOrder(
    "modules/creators/src/actions/edit-profile.ts",
    "if (!session?.user?.id)",
    "rateLimit(`edit-profile:${session.user.id}`",
    "const creator = await getCreator(creatorId)"
  );
});

test("both creator-registration entry points share one budget", () => {
  for (const file of [
    "modules/creators/src/actions/register.ts",
    "apps/web/src/app/api/creators/route.ts",
  ]) {
    assert.match(source(file), /creator-register:\$\{/);
    assert.match(source(file), /, 5, 10 \* 60 \* 1000\)/);
  }
});

test("progress and notification writes use generous per-user backstops", () => {
  assertGuardOrder(
    "modules/progress/src/actions/progress.ts",
    "if (!userId) return",
    "rateLimit(`save-progress:${userId}`",
    "await importCompletions(userId, p)"
  );
  assert.match(
    source("modules/progress/src/actions/progress.ts"),
    /rateLimit\(`save-progress:\$\{userId\}`, 60, 60 \* 1000\)/
  );

  assertGuardOrder(
    "apps/web/src/app/api/notifications/read/route.ts",
    "if (!session?.user?.id)",
    "rateLimit(`notif-read:${session.user.id}`",
    "const { id } = await request.json()"
  );
});

test("creator submission keeps its product cooldown in addition to the shared limiter", () => {
  const text = source("modules/creators/src/actions/submit.ts");
  assert.match(text, /const SUBMIT_COOLDOWN_MS = 30_000/);
  assert.match(text, /Date\.now\(\) - lastPost\.createdAt\.getTime\(\) < SUBMIT_COOLDOWN_MS/);
});

test("certificate OG rendering is protected before lookup and font work", () => {
  const text = source("apps/web/src/app/api/cert-og/route.tsx");
  const ip = text.indexOf("const ip = await getClientIp()");
  const guard = text.indexOf("rateLimit(`cert-og:${ip}`");
  const lookup = text.indexOf("const code = (new URL(request.url)");
  assert.ok(ip >= 0 && guard > ip && lookup > guard);
  assert.match(text, /rateLimit\(`cert-og:\$\{ip\}`, 60, 60 \* 1000\)/);
});
