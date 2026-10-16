import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Notify Google's Indexing API that our job-posting pages changed, so they get
// (re)crawled quickly. Scope note: Google's Indexing API is officially only for
// JobPosting and BroadcastEvent pages — our /jobs/[slug] pages emit JobPosting
// JSON-LD, so this is a compliant use. Do NOT point it at lessons or blog posts;
// those rely on the sitemap + manual "Request Indexing".
//
// Usage:
//   npm run notify-index            # notify all job URLs
//   npm run notify-index -- --dry-run   # just print the URLs, no API calls
//
// Auth: a Google Cloud service account with Owner access to the Search Console
// property. Provide its JSON key via ONE of:
//   GOOGLE_INDEXING_KEY_FILE=/path/to/key.json   (local dev)
//   GOOGLE_INDEXING_KEY='{"type":"service_account",...}'  (CI / Vercel secret)
// See docs/search-indexing-api.md for the full setup.

const DRY_RUN = process.argv.includes("--dry-run");
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thecodefix.net"
).replace(/\/$/, "");
const JOBS_DIR = path.join(process.cwd(), "content", "ar", "jobs");
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const INDEXING_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const SCOPE = "https://www.googleapis.com/auth/indexing";

// ── Collect job URLs (slug = filename, mirrors src/lib/jobs.ts) ──────────
function jobUrls() {
  if (!fs.existsSync(JOBS_DIR)) return [];
  return fs
    .readdirSync(JOBS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => `${SITE_URL}/jobs/${f.replace(/\.json$/, "")}`);
}

// ── Load the service-account key from a file or an inline env var ────────
function loadServiceAccount() {
  const filePath = process.env.GOOGLE_INDEXING_KEY_FILE;
  const inline = process.env.GOOGLE_INDEXING_KEY;
  let raw;
  if (filePath) {
    raw = fs.readFileSync(filePath, "utf-8");
  } else if (inline) {
    raw = inline;
  } else {
    console.error(
      "Missing credentials. Set GOOGLE_INDEXING_KEY_FILE (path) or GOOGLE_INDEXING_KEY (JSON).\n" +
        "See docs/search-indexing-api.md."
    );
    process.exit(1);
  }
  const key = JSON.parse(raw);
  if (!key.client_email || !key.private_key) {
    console.error("Service-account key is missing client_email / private_key.");
    process.exit(1);
  }
  return key;
}

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// ── Exchange the service-account key for an OAuth access token (JWT grant)
async function getAccessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(signingInput), key.private_key)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token request failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ── Notify one URL ───────────────────────────────────────────────────────
async function notify(token, url) {
  const res = await fetch(INDEXING_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, type: "URL_UPDATED" }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ── Main ─────────────────────────────────────────────────────────────────
const urls = jobUrls();
if (urls.length === 0) {
  console.log("No job pages found in src/content/jobs — nothing to do.");
  process.exit(0);
}

console.log(`Found ${urls.length} job URL(s):`);
for (const u of urls) console.log(`  • ${u}`);

if (DRY_RUN) {
  console.log("\n--dry-run: no API calls made.");
  process.exit(0);
}

const key = loadServiceAccount();
const token = await getAccessToken(key);

let ok = 0;
let failed = 0;
for (const url of urls) {
  try {
    const r = await notify(token, url);
    if (r.ok) {
      ok++;
      console.log(`✓ ${url}`);
    } else {
      failed++;
      console.error(`✗ ${url} — ${r.status} ${JSON.stringify(r.data)}`);
    }
  } catch (err) {
    failed++;
    console.error(`✗ ${url} — ${err.message}`);
  }
}

console.log(`\nDone. ${ok} notified, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
