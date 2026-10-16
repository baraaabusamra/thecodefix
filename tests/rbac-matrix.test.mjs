import test, { mock } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { sourceRoots } from "./helpers/source-roots.mjs";

// RBAC regression matrix.
//
// 1. Completeness: every exported Server Action in the app must be declared
//    below — PRIVILEGED (with the capabilities it requires), SELF (acts only
//    on the signed-in user's own data) or PUBLIC. Adding an action without
//    declaring its authorization expectation fails this suite.
// 2. Behaviour: every PRIVILEGED action is invoked for all 10 roles (and for
//    "no admin access") through its REAL guard, with the REAL rbac table.
//    Denied ⇔ it throws "Forbidden" before touching anything. The database is
//    a tripwire (any access throws DB_REACHED), so an allowed call proves it
//    passed the guard without writing.
// 3. SELF actions called anonymously must not reach the database.

const ROLES = [
  "student", "creator", "support", "writer", "sales",
  "operations", "marketing", "designer", "admin", "owner",
];

// file → action → capabilities required (ALL of them).
const PRIVILEGED = {
  "modules/academic/src/actions/admin-academic.ts": {
    saveStudyPlan: ["content:edit"],
    deleteStudyPlan: ["content:edit"],
  },
  "modules/admin/src/actions/content.ts": {
    saveLesson: ["content:edit"],
    createTrack: ["content:edit", "content:publish"],
    createLesson: ["content:edit"],
    updateDbLesson: ["content:edit"],
    deleteDbLesson: ["content:edit"],
    deleteTrack: ["content:edit", "content:publish"],
  },
  "modules/creators/src/actions/admin-creators.ts": {
    suspendCreator: ["creators:review"],
    activateCreator: ["creators:review"],
  },
  "modules/creators/src/actions/admin-review.ts": {
    approveSubmission: ["creators:review"],
    rejectSubmission: ["creators:review"],
    requestRevision: ["creators:review"],
    deleteSubmission: ["creators:review"],
  },
  "modules/jobs/src/actions/admin-jobs.ts": { saveJob: ["jobs:moderate"] },
  "modules/admin/src/actions/ops-content.ts": {
    setLessonWorkflow: ["ops:manage", "content:publish"],
  },
  "modules/admin/src/actions/ops-instructors.ts": {
    createInstructor: ["ops:manage"],
    updateInstructor: ["ops:manage"],
    updateInstructorPayout: ["ops:manage", "billing:manage"],
    addInstructorTrack: ["ops:manage"],
    removeInstructorTrack: ["ops:manage"],
    deleteInstructor: ["ops:manage"],
  },
  "modules/admin/src/actions/ops-outreach.ts": {
    updateOutreach: ["ops:manage"],
    addOutreach: ["ops:manage"],
    deleteOutreach: ["ops:manage"],
  },
  "modules/admin/src/actions/ops-tickets.ts": {
    createTicket: ["ops:manage"],
    updateTicket: ["ops:manage"],
    addTicketReply: ["ops:manage"],
    deleteTicket: ["ops:manage"],
  },
  "modules/academic/src/actions/admin-pipeline.ts": {
    fetchUniversities: ["settings:manage"],
    fetchPrograms: ["settings:manage"],
    discoverSources: ["settings:manage"],
    enqueueCollectionJob: ["settings:manage"],
    runCollectionBatch: ["settings:manage"],
    runCollectionJob: ["settings:manage"],
    runExtractionBatch: ["settings:manage"],
  },
  "modules/assessment/src/actions/admin-quizzes.ts": {
    saveQuiz: ["content:edit"],
    revokeCertificate: ["settings:manage"],
  },
  "modules/admin/src/actions/reports.ts": {
    submitReport: ["reports:submit"],
    reviewReport: ["reports:review"],
    deleteReport: ["reports:submit"],
  },
  "modules/admin/src/actions/seo.ts": {
    addKeyword: ["seo:manage"],
    updateKeyword: ["seo:manage"],
    deleteKeyword: ["seo:manage"],
  },
  "modules/admin/src/actions/settings.ts": { updateUserRole: ["settings:manage"] },
  "modules/feedback/src/actions/admin-suggestions.ts": {
    setSuggestionStatus: ["content:edit"],
    deleteSuggestion: ["content:edit"],
  },
};

// Signed-in user acting on their own data (ownership is tested per feature:
// exam-concurrency, lesson-completion, creator-url-validation, …).
const SELF = {
  "modules/certificates/src/actions/certificate.ts": ["issueCertificate", "issueSecureCertificate", "getMyCertificateStatus"],
  "modules/creators/src/actions/edit-profile.ts": ["updateOwnCreatorProfile"],
  "modules/creators/src/actions/register.ts": ["registerCreator"],
  "modules/creators/src/actions/submissions.ts": ["deleteOwnPost"],
  "modules/creators/src/actions/edit-post.ts": ["updateOwnPost"],
  "modules/creators/src/actions/submit.ts": ["submitVideo"],
  "modules/assessment/src/actions/lesson-quiz.ts": ["startLessonQuiz", "submitLessonQuiz", "getMyLessonQuizStatus"],
  "modules/progress/src/actions/progress.ts": [
    "completeLesson", "uncompleteLesson", "getMyProgress", "getMyStats", "saveMyProgress", "saveMyName",
  ],
  "modules/assessment/src/actions/exam.ts": ["getExamEligibility", "startOrResumeExam", "saveExamAnswer", "submitExam"],
};

// Deliberately public (rate-limited / key-gated; covered by their own tests).
const PUBLIC = {
  "packages/identity/src/actions/admin-session.ts": ["submitAdminKey", "adminSignOut"],
  "modules/jobs/src/actions/alerts.ts": ["subscribeJobAlert"],
  "modules/feedback/src/actions/suggest.ts": ["submitSuggestion"],
};

// ── Tripwire environment ─────────────────────────────────────────────────
let access = { ok: false, mode: "rbac", reason: "signin" };
let sessionUser = null;
const dbTripwire = new Proxy(
  {},
  {
    get() {
      throw new Error("DB_REACHED");
    },
  }
);
mock.module("@tcf/db", {
  exports: { db: dbTripwire, requireDb: () => dbTripwire, isDbEnabled: () => true, schema: {} },
});
mock.module("@tcf/identity/admin-access", { exports: { resolveAdmin: async () => access, ADMIN_COOKIE: "tcf_admin" } });
mock.module("@tcf/identity/auth", { exports: { auth: async () => (sessionUser ? { user: sessionUser } : null) } });
mock.module("@tcf/core/rate-limit", { exports: { rateLimit: () => true, getClientIp: async () => "t" } });
mock.module("next/cache", {
  exports: {
    revalidatePath: () => {},
    revalidateTag: () => {},
    updateTag: () => {},
    unstable_cache: (fn) => fn,
  },
});
mock.module("next/navigation", {
  exports: {
    redirect: (to) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { to });
    },
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  },
});

const { can } = await import("../packages/identity/src/rbac.ts");

// Plausible inputs: enough to get past input checks to the DB tripwire, and
// chosen so nothing can reach the filesystem (unknown lesson slug, invalid
// quiz/job JSON).
function probeForm() {
  const fd = new FormData();
  const fields = {
    id: "rbac-probe-id", userId: "rbac-probe-user", role: "student", slug: "rbac-probe-slug",
    track: "rbac_probe_track", title: "RBAC probe", content: "not json", key: "k", status: "draft",
    decision: "approved", category: "other", details: "d", keyword: "k", name: "n", subject: "s",
    body: "b", priority: "normal", reviewNote: "", country: "jo", university: "uni",
    specialization: "cs", categoriesJson: "[]", ticketId: "t", guide: "funding", email: "a@b.co",
    payoutMethod: "bank", bankDetails: "x",
  };
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function invoke(fn) {
  try {
    // FormData actions take one argument; arg-style ones (pipeline) take ids.
    await (fn.length >= 2 ? fn("rbac-probe-a", "rbac-probe-b") : fn(fn.length === 1 ? probeForm() : undefined));
    return "passed-guard";
  } catch (e) {
    return e?.message === "Forbidden" ? "forbidden" : "passed-guard";
  }
}

const modules = {};
async function load(file) {
  modules[file] ??= await import(path.join("..", file).replaceAll("\\", "/"));
  return modules[file];
}

test("completeness: every exported Server Action has a declared authorization expectation", () => {
  const declared = new Map();
  for (const [file, actions] of Object.entries(PRIVILEGED)) {
    for (const a of Object.keys(actions)) declared.set(`${file}#${a}`, "privileged");
  }
  for (const group of [SELF, PUBLIC]) {
    for (const [file, actions] of Object.entries(group)) for (const a of actions) declared.set(`${file}#${a}`, "x");
  }

  const found = new Set();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const text = fs.readFileSync(p, "utf8");
        if (!/^\s*["']use server["']/.test(text)) continue;
        for (const m of text.matchAll(/^export async function (\w+)/gm)) {
          found.add(`${p.replaceAll("\\", "/")}#${m[1]}`);
        }
      }
    }
  };
  for (const root of sourceRoots()) walk(root);

  const undeclared = [...found].filter((k) => !declared.has(k));
  const stale = [...declared.keys()].filter((k) => !found.has(k));
  assert.deepStrictEqual(undeclared, [], "declare these actions in tests/rbac-matrix.test.mjs");
  assert.deepStrictEqual(stale, [], "these declared actions no longer exist");
});

for (const [file, actions] of Object.entries(PRIVILEGED)) {
  for (const [name, caps] of Object.entries(actions)) {
    test(`${name} (${caps.join(" + ")}): allowed exactly for roles holding every required capability`, async () => {
      const fn = (await load(file))[name];
      assert.equal(typeof fn, "function");

      access = { ok: false, mode: "rbac", reason: "signin" };
      sessionUser = null;
      assert.equal(await invoke(fn), "forbidden", "no admin access must be refused");

      const mismatches = [];
      for (const role of ROLES) {
        access = { ok: true, mode: "rbac", role };
        sessionUser = { id: `u-${role}`, role };
        const expected = caps.every((c) => can(role, c)) ? "passed-guard" : "forbidden";
        const actual = await invoke(fn);
        if (actual !== expected) mismatches.push(`${role}: expected ${expected}, got ${actual}`);
      }
      assert.deepStrictEqual(mismatches, []);
    });
  }
}

test("SELF actions never touch the database for anonymous callers", async () => {
  access = { ok: false, mode: "rbac", reason: "signin" };
  sessionUser = null;
  const reached = [];
  for (const [file, names] of Object.entries(SELF)) {
    const mod = await load(file);
    for (const name of names) {
      try {
        await mod[name](...(mod[name].length >= 2 ? ["a", "b", probeForm()] : [probeForm()]));
      } catch (e) {
        if (e?.message === "DB_REACHED") reached.push(`${file}#${name}`);
      }
    }
  }
  assert.deepStrictEqual(reached, []);
});

test("sanity: the tripwire really detects database access", async () => {
  access = { ok: true, mode: "rbac", role: "owner" };
  sessionUser = { id: "u-owner", role: "owner" };
  const { updateUserRole } = await load("modules/admin/src/actions/settings.ts");
  await assert.rejects(updateUserRole(probeForm()), /DB_REACHED/);
});
