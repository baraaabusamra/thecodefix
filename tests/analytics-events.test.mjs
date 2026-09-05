import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

import {
  ANALYTICS_EVENT_PROPERTIES,
  sanitizeAnalyticsProperties,
} from "../src/lib/analytics-contract.ts";

const REQUIRED_PRODUCT_EVENTS = [
  "track_view",
  "lesson_start",
  "lesson_complete",
  "playground_run",
  "quiz_start",
  "quiz_pass",
  "signup_start",
  "signup_complete",
  "certificate_issue",
  "certificate_share",
  "job_apply_click",
  "pricing_cta_click",
  "contact_company_click",
];

test("the product analytics contract contains every roadmap event", () => {
  for (const event of REQUIRED_PRODUCT_EVENTS) {
    assert.ok(event in ANALYTICS_EVENT_PROPERTIES, `missing event: ${event}`);
  }
});

test("the analytics contract cannot allow personal data or raw user code", () => {
  const forbidden = /email|name|user|code|content|message|phone|address/i;
  for (const [event, properties] of Object.entries(ANALYTICS_EVENT_PROPERTIES)) {
    for (const property of properties) {
      assert.doesNotMatch(property, forbidden, `${event} allows unsafe property ${property}`);
    }
  }

  assert.deepEqual(
    sanitizeAnalyticsProperties("lesson_start", {
      track: "javascript",
      lesson: "variables",
      email: "learner@example.com",
      code: "secret user code",
    }),
    { track: "javascript", lesson: "variables" }
  );
});

test("client event producers use the shared analytics gateway", () => {
  const componentsDir = path.join(process.cwd(), "src", "components");
  const directImports = fs
    .readdirSync(componentsDir, { recursive: true })
    .filter((entry) => typeof entry === "string" && /\.tsx?$/.test(entry))
    .filter((entry) => {
      const source = fs.readFileSync(path.join(componentsDir, entry), "utf8");
      return source.includes('from "@vercel/analytics/react"');
    });

  assert.deepEqual(
    directImports,
    [],
    `direct Vercel event imports bypass the privacy gateway: ${directImports.join(", ")}`
  );
});

test("the analytics gateway fans out to Vercel and configured GA4", () => {
  const gateway = fs.readFileSync(
    path.join(process.cwd(), "src/lib/analytics.ts"),
    "utf8"
  );
  assert.match(gateway, /trackVercelEvent\(name, safeProperties\)/);
  assert.match(gateway, /process\.env\.NEXT_PUBLIC_GA_ID/);
  assert.match(gateway, /sendGAEvent\("event", name, safeProperties\)/);
});

test("the roadmap events are wired to their product interactions", () => {
  const files = [
    "src/components/TrackView.tsx",
    "src/components/RecordVisit.tsx",
    "src/components/LessonComplete.tsx",
    "src/components/Playground.tsx",
    "src/components/QuizRunner.tsx",
    "src/components/LessonQuiz.tsx",
    "src/components/AuthConversionTracker.tsx",
    "src/components/Certificate.tsx",
    "src/components/SecureCertificate.tsx",
    "src/components/JobSearchLinks.tsx",
    "src/components/SubscribeButton.tsx",
    "src/app/contact/page.tsx",
    "src/lib/analytics.ts",
  ];
  const producers = files
    .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
    .join("\n");

  for (const event of REQUIRED_PRODUCT_EVENTS) {
    assert.ok(producers.includes(`"${event}"`), `event is not wired: ${event}`);
  }
});
