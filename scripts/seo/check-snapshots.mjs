#!/usr/bin/env node
// Validate the Search Console snapshots in docs/seo/gsc/ and the forecast file.
//
//   node scripts/seo/check-snapshots.mjs                    # all files (npm run check:seo-data)
//   node scripts/seo/check-snapshots.mjs --sha <hash> FILE  # also prove FILE is byte-identical
//                                                           # to what the workbench printed
//
// The sha check is how a snapshot copied out of the Composio workbench is
// proven unchanged: gsc_collect.py prints sha256 of the exact file text.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { SNAP_DIR, FORECAST_FILE, validateSnapshot, sha256, parseArgs } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
let failed = 0;

if (args.sha) {
  const file = args._[0];
  const text = fs.readFileSync(file, "utf8");
  const got = sha256(text);
  if (got !== args.sha) {
    console.error(`✗ ${file}: sha256 ${got} does not match ${args.sha} — the copy differs from the workbench output. Copy it again.`);
    // Locate the bad lines: in the workbench print
    //   " ".join(hashlib.md5(l.encode()).hexdigest()[:6] for l in text.split("\n"))
    // and pass it as --lines "<that output>".
    if (typeof args.lines === "string") {
      const want = args.lines.trim().split(/\s+/);
      const have = text.split("\n").map((l) => crypto.createHash("md5").update(l, "utf8").digest("hex").slice(0, 6));
      if (want.length !== have.length) console.error(`  line count: file ${have.length}, workbench ${want.length}`);
      for (let i = 0; i < Math.max(want.length, have.length); i++) {
        if (want[i] !== have[i]) console.error(`  line ${i + 1} differs: ${JSON.stringify(text.split("\n")[i] ?? "")}`);
      }
    }
    process.exit(1);
  }
  console.log(`✓ ${file}: sha256 matches`);
}

const files = fs.existsSync(SNAP_DIR) ? fs.readdirSync(SNAP_DIR).filter((f) => f.endsWith(".json")).sort() : [];
let prevEnd = null;
for (const f of files) {
  const p = path.join(SNAP_DIR, f);
  let snap;
  try {
    snap = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.error(`✗ ${p}: invalid JSON (${e.message})`);
    failed++;
    continue;
  }
  const errs = validateSnapshot(snap, f);
  if (errs.length) {
    console.error(`✗ ${p}: ${errs.join("; ")}`);
    failed++;
  }
  if (prevEnd && snap.start) {
    const gap = (new Date(snap.start) - new Date(prevEnd)) / 86400000;
    if (gap !== 1) console.log(`  note: gap before ${snap.week} (${gap - 1} missing days)`);
  }
  prevEnd = snap.end;
}

if (fs.existsSync(FORECAST_FILE)) {
  try {
    const fc = JSON.parse(fs.readFileSync(FORECAST_FILE, "utf8"));
    for (const [month, b] of Object.entries(fc.months ?? {})) {
      if (!/^\d{4}-\d{2}$/.test(month) || !(b.pessimistic <= b.expected && b.expected <= b.optimistic)) {
        console.error(`✗ ${FORECAST_FILE}: month ${month} must be YYYY-MM with pessimistic ≤ expected ≤ optimistic`);
        failed++;
      }
    }
  } catch (e) {
    console.error(`✗ ${FORECAST_FILE}: invalid JSON (${e.message})`);
    failed++;
  }
}

if (failed) process.exit(1);
console.log(`✓ check:seo-data — ${files.length} snapshot(s) valid${fs.existsSync(FORECAST_FILE) ? ", forecast valid" : ""}`);
